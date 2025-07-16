import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import * as fs from "fs/promises";
import * as path from "path";
import type {
  NewsArticle,
  NewsResponse,
  TaggedNewsArticle,
  TaggedNewsResponse,
} from "./lib/article-utils";
import { deduplicateArticles } from "./lib/article-utils";

interface Tag {
  id: string;
  name: string;
  description: string;
}

interface TagCategory {
  title: string;
  description: string;
  color: string;
  tags: Tag[];
}

type TagDefinition = TagCategory[];

class NewsArticleTagger {
  private client: BedrockRuntimeClient;
  private tagDefinitions: TagDefinition;
  private systemPrompt: string;
  private userPromptTemplate: string;

  private constructor(
    tagDefinitions: TagDefinition,
    systemPrompt: string,
    userPromptTemplate: string
  ) {
    this.client = new BedrockRuntimeClient();
    this.tagDefinitions = tagDefinitions;
    this.systemPrompt = systemPrompt;
    this.userPromptTemplate = userPromptTemplate;
  }

  public static async create(
    tagDefinitions: TagDefinition
  ): Promise<NewsArticleTagger> {
    const systemPromptPath = path.join(
      __dirname,
      "lib",
      "ai",
      "system-prompt.txt"
    );
    const userPromptPath = path.join(
      __dirname,
      "lib",
      "ai",
      "user-prompt.txt"
    );
    const [systemPrompt, userPromptTemplate] = await Promise.all([
      fs.readFile(systemPromptPath, "utf-8"),
      fs.readFile(userPromptPath, "utf-8"),
    ]);
    return new NewsArticleTagger(
      tagDefinitions,
      systemPrompt,
      userPromptTemplate
    );
  }

  private async invokeModel(
    userPrompt: string,
    modelId: string
  ): Promise<string> {
    let body;

    if (modelId.startsWith("anthropic")) {
      body = JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        system: this.systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        max_tokens: 500,
        temperature: 0.2,
        top_p: 0.9,
      });
    } else if (modelId.startsWith("amazon")) {
      const prompt = `${this.systemPrompt}\n\nHuman: ${userPrompt}\n\nAssistant:`;
      body = JSON.stringify({
        inputText: prompt,
        textGenerationConfig: {
          maxTokenCount: 512,
          temperature: 0.2,
          topP: 0.9,
        },
      });
    } else {
      throw new Error(`Unsupported model provider for modelId: ${modelId}`);
    }

    const command = new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body,
    });

    const response = await this.client.send(command);
    const decodedBody = new TextDecoder().decode(response.body);
    const responseBody = JSON.parse(decodedBody);

    if (modelId.startsWith("anthropic")) {
      if (responseBody.content && responseBody.content.length > 0) {
        return responseBody.content[0].text;
      }
    } else if (modelId.startsWith("amazon")) {
      if (responseBody.results && responseBody.results.length > 0) {
        return responseBody.results[0].outputText;
      }
    }

    throw new Error("Empty or invalid response from model");
  }

  async tagArticlesIndividually(
    newsData: NewsResponse
  ): Promise<TaggedNewsResponse> {
    const taggedArticles: TaggedNewsArticle[] = [];

    for (let i = 0; i < newsData.articles.length; i++) {
      const article = newsData.articles[i];
      console.log(
        `Processing article ${i + 1}/${newsData.articles.length}: ${
          article.title
        }`
      );

      try {
        const tags = await this.tagSingleArticle(article);
        console.log(`Tags for article ${article.title}: ${tags.join(", ")}`);
        
        taggedArticles.push({ ...article, tags });

        if (i < newsData.articles.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error processing article "${article.title}":`, error);
        taggedArticles.push({ ...article, tags: [] });
      }
    }

    return {
      status: newsData.status,
      totalResults: newsData.totalResults,
      articles: taggedArticles,
    };
  }

  public async tagSingleArticle(article: NewsArticle): Promise<string[]> {
    const prompt = this.createSingleArticlePrompt(article);

    const maxRetries = 5;
    let attempt = 0;
    let delay = 1000; // start with 1 second

    while (attempt < maxRetries) {
      try {
        const responseText = await this.invokeModel(
          prompt,
          "anthropic.claude-instant-v1"
        );
        return this.parseTagsFromResponse(responseText);
      } catch (error: any) {
        if (error.name === "ThrottlingException" && attempt < maxRetries - 1) {
          console.warn(
            `Throttling detected. Retrying in ${delay / 1000}s... (Attempt ${
              attempt + 1
            }/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff
          attempt++;
        } else {
          // For other errors or max retries reached, re-throw the error
          throw error;
        }
      }
    }

    // This part should not be reached if logic is correct, but as a fallback:
    throw new Error(`Max retries reached for tagging article: ${article.title}`);
  }

  private createSingleArticlePrompt(article: NewsArticle): string {
    const tagDefinitionsText = this.formatTagDefinitions();

    // console.log("#####")
    // console.log(tagDefinitionsText)
    // console.log("#####")

    let prompt = this.userPromptTemplate
      .replace("{tag_definitions}", tagDefinitionsText)
      .replace("{title}", article.title)
      .replace("{description}", article.description || "");

    if (article.content) {
      prompt = prompt.replace("{content}", article.content);
    } else {
      prompt = prompt.replace("{content}", "No content available.");
    }
    return prompt;
  }

  private formatTagDefinitions(): string {
    let formatted = "";
    for (const category of this.tagDefinitions) {
      formatted += `\n${category.title.toUpperCase()}: ${
        category.description
      }\n`;
      for (const tag of category.tags) {
        formatted += `  - ${tag.id}: ${tag.description}\n`;
      }
    }
    return formatted;
  }

  private parseTagsFromResponse(responseText: string): string[] {
    const validTags = this.tagDefinitions.flatMap((category) =>
      category.tags.map((tag) => tag.id)
    );

    try {
      const jsonString = responseText.trim();
      const tags = JSON.parse(jsonString);
      if (Array.isArray(tags)) {
        return tags.filter(
          (tag) => typeof tag === "string" && validTags.includes(tag)
        );
      }
      return [];
    } catch (error) {
      console.error("Error parsing tags from response:", responseText, error);
      return [];
    }
  }
}

async function main() {
  // --- CONFIGURATION ---
  const RAW_NEWS_DIR = path.join(__dirname, "..", "data", "news", "raw");
  const TAGGED_NEWS_DIR = path.join(__dirname, "..", "data", "news", "tagged");
  const TAGS_FILE_PATH = path.join(
    __dirname,
    "..",
    "data",
    "tags",
    "tags.json"
  );

  // Load tag definitions
  const tagDefinitions: TagDefinition = JSON.parse(
    await fs.readFile(TAGS_FILE_PATH, "utf8")
  );

  // Instantiate the tagger
  const tagger = await NewsArticleTagger.create(tagDefinitions);

  // Find untagged files
  await fs.mkdir(TAGGED_NEWS_DIR, { recursive: true });
  const rawFiles = await fs.readdir(RAW_NEWS_DIR);
  const taggedFiles = new Set(await fs.readdir(TAGGED_NEWS_DIR));
  const untaggedFiles = rawFiles.filter(
    (file) => !taggedFiles.has(file) && file.endsWith(".json")
  );

  if (untaggedFiles.length === 0) {
    console.log("All news files are already tagged. Nothing to do.");
    return;
  }

  console.log(
    `Found ${
      untaggedFiles.length
    } untagged news file(s): ${untaggedFiles.join(", ")}. Starting process...`
  );

  for (const fileName of untaggedFiles) {
    console.log(`--- Processing: ${fileName} ---`);
    const rawFilePath = path.join(RAW_NEWS_DIR, fileName);
    const taggedFilePath = path.join(TAGGED_NEWS_DIR, fileName);

    try {
      const rawJsonString = await fs.readFile(rawFilePath, "utf-8");
      const newsData: NewsResponse = JSON.parse(rawJsonString);

      const originalCount = newsData.articles.length;
      newsData.articles = deduplicateArticles(newsData.articles);
      newsData.totalResults = newsData.articles.length;
      const duplicateCount = originalCount - newsData.totalResults;
      if (duplicateCount > 0) {
        console.log(
          `Removed ${duplicateCount}/${originalCount} duplicate/similar articles.`
        );
      }

      if (newsData.articles.length === 0) {
        console.log("No unique articles to tag. Skipping.");
        await fs.writeFile(
          taggedFilePath,
          JSON.stringify({ ...newsData, articles: [] }, null, 2)
        );
        console.log(`Created empty tagged file: ${fileName}`);
        continue;
      }

      const taggedResult = await tagger.tagArticlesIndividually(newsData);

      await fs.writeFile(taggedFilePath, JSON.stringify(taggedResult, null, 2));
      console.log(`Successfully tagged and saved: ${fileName}`);
    } catch (error) {
      console.error(`Failed to process ${fileName}:`, error);
    }
    console.log(`--- Finished: ${fileName} ---\n`);
  }

  console.log("Tagging process completed.");
}

main()
  .then(() => console.log("Done"))
  .catch(console.error);

export { NewsArticleTagger };
export type { TagDefinition, TaggedNewsResponse };
