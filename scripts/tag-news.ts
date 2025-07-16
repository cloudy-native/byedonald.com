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
  private singleArticlePromptTemplate: string;

  private constructor(
    tagDefinitions: TagDefinition,
    singleArticlePromptTemplate: string
  ) {
    this.client = new BedrockRuntimeClient();
    this.tagDefinitions = tagDefinitions;
    this.singleArticlePromptTemplate = singleArticlePromptTemplate;
  }

  public static async create(
    tagDefinitions: TagDefinition
  ): Promise<NewsArticleTagger> {
    const promptFilePath = path.join(
      __dirname,
      "lib",
      "ai",
      "article-tagging-prompt.txt"
    );
    const singleArticlePromptTemplate = await fs.readFile(
      promptFilePath,
      "utf-8"
    );
    return new NewsArticleTagger(tagDefinitions, singleArticlePromptTemplate);
  }

  private async invokeModel(prompt: string, modelId: string): Promise<string> {
    const command = new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
        max_tokens_to_sample: 500,
        temperature: 0.2,
        top_p: 0.9,
      }),
    });

    const response = await this.client.send(command);
    const decodedBody = new TextDecoder().decode(response.body);
    const responseBody = JSON.parse(decodedBody);

    return responseBody.completion;
  }

  async tagArticlesIndividually(
    newsData: NewsResponse
  ): Promise<TaggedNewsResponse> {
    const taggedArticles: TaggedNewsArticle[] = [];

    for (let i = 0; i < newsData.articles.length; i++) {
      const article = newsData.articles[i];
      console.log(
        `Processing article ${i + 1}/${newsData.articles.length}: ${article.title}`
      );

      try {
        const tags = await this.tagSingleArticle(article);
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

    const responseText = await this.invokeModel(
      prompt,
      "anthropic.claude-3-haiku-20240307-v1:0"
    );

    return this.parseTagsFromResponse(responseText);
  }

  private createSingleArticlePrompt(article: NewsArticle): string {
    const tagDefinitionsText = this.formatTagDefinitions();

    return `
      Given an article with the following details:
      Title: ${article.title}
      Description: ${article.description}
      Content: ${article.content}

      Assign appropriate tags from the following list based on the article's content (use the tag IDs):
      ${tagDefinitionsText}

      Return the tags as a JSON array of strings using the tag IDs.
    `;
  }

  private formatTagDefinitions(): string {
    let formatted = "";
    for (const category of this.tagDefinitions) {
      formatted += `\n${category.title.toUpperCase()}: ${category.description}\n`;
      for (const tag of category.tags) {
        formatted += `  - ${tag.id}: ${tag.description}\n`;
      }
    }
    return formatted;
  }

  private parseTaggedArticles(
    response: string,
    originalArticles: NewsArticle[]
  ): TaggedNewsArticle[] {
    try {
      const jsonMatch = response.match(/(\[[\s\S]*\])/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }

      const tagResults = JSON.parse(jsonMatch[0]);

      return originalArticles.map((article, index) => {
        const tagResult = tagResults.find(
          (result: any) => result.index === index
        );
        const tags = tagResult ? tagResult.tags : [];
        return { ...article, tags };
      });
    } catch (error) {
      console.error("Error parsing batch response:", error);
      return originalArticles.map((article) => ({ ...article, tags: [] }));
    }
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
    `Found ${untaggedFiles.length} untagged news file(s): ${untaggedFiles.join(", ")}. Starting process...`
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
    console.log(`--- Finished: ${fileName} ---
`);
  }

  console.log("Tagging process completed.");
}

main()
  .then(() => console.log("Done"))
  .catch(console.error);

export { NewsArticleTagger };
export type { TagDefinition, TaggedNewsResponse };
