import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import tagDefinitions from "../data/tags/tags.json";
import type {
  NewsArticle,
  NewsResponse,
  TaggedNewsArticle,
  TaggedNewsResponse,
} from "./lib/article-utils";
import { deduplicateArticles } from "./lib/article-utils";
import { parseJsonArrayFromModelResponse } from "./lib/tag-response-parser";

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

interface ModelProviderHandler {
  canHandle(modelId: string): boolean;
  buildBody(systemPrompt: string, userPrompt: string): string;
  parseResponse(responseBody: unknown): string;
}

class AnthropicHandler implements ModelProviderHandler {
  canHandle(modelId: string): boolean {
    return modelId.startsWith("anthropic");
  }

  buildBody(systemPrompt: string, userPrompt: string): string {
    return JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 500,
      temperature: 0.2,
      top_p: 0.9,
    });
  }

  parseResponse(responseBody: unknown): string {
    const body = responseBody as {
      content?: Array<{ text?: string }>;
    };
    if (
      Array.isArray(body.content) &&
      typeof body.content[0]?.text === "string"
    ) {
      return body.content[0].text;
    }
    throw new Error("Empty or invalid response from Anthropic model");
  }
}

class AmazonNovaHandler implements ModelProviderHandler {
  canHandle(modelId: string): boolean {
    return modelId.startsWith("amazon.nova");
  }

  buildBody(systemPrompt: string, userPrompt: string): string {
    return JSON.stringify({
      messages: [
        { role: "user", content: [{ text: systemPrompt }] },
        { role: "user", content: [{ text: userPrompt }] },
      ],
      inferenceConfig: {
        maxTokens: 256,
        stopSequences: [],
        temperature: 0.2,
        topP: 0.8,
      },
    });
  }

  parseResponse(responseBody: unknown): string {
    const body = responseBody as {
      output?: {
        message?: {
          content?: Array<{ text?: string }>;
        };
      };
    };
    const content = body.output?.message?.content;
    if (Array.isArray(content) && typeof content[0]?.text === "string") {
      return content[0].text;
    }
    console.error(
      "Invalid response structure from Amazon Nova model:",
      JSON.stringify(responseBody, null, 2),
    );
    throw new Error("Empty or invalid response from Amazon Nova model");
  }
}

class NewsArticleTagger {
  private client: BedrockRuntimeClient;
  private tagDefinitions: TagDefinition;
  private systemPrompt: string;
  private userPromptTemplate: string;
  private modelHandlers: ModelProviderHandler[];
  private maxTags: number;

  private constructor(
    tagDefinitions: TagDefinition,
    systemPrompt: string,
    userPromptTemplate: string,
    maxTags: number,
  ) {
    this.client = new BedrockRuntimeClient();
    this.tagDefinitions = tagDefinitions;
    this.systemPrompt = systemPrompt;
    this.userPromptTemplate = userPromptTemplate;
    this.modelHandlers = [new AnthropicHandler(), new AmazonNovaHandler()];
    this.maxTags = maxTags;
  }

  public static async create(
    tagDefinitions: TagDefinition,
  ): Promise<NewsArticleTagger> {
    const systemPromptPath = path.join(
      __dirname,
      "lib",
      "ai",
      "system-prompt.txt",
    );
    const userPromptPath = path.join(__dirname, "lib", "ai", "user-prompt.txt");
    const [systemPromptRaw, userPromptTemplate] = await Promise.all([
      fs.readFile(systemPromptPath, "utf-8"),
      fs.readFile(userPromptPath, "utf-8"),
    ]);
    const maxTagsEnv = Number(process.env.MAX_TAGS);
    const maxTags =
      Number.isFinite(maxTagsEnv) && maxTagsEnv > 0 ? maxTagsEnv : 5;
    const systemPrompt = systemPromptRaw.replace("{max_tags}", String(maxTags));
    return new NewsArticleTagger(
      tagDefinitions,
      systemPrompt,
      userPromptTemplate,
      maxTags,
    );
  }

  private async invokeModel(
    userPrompt: string,
    modelId: string,
  ): Promise<string> {
    const handler = this.modelHandlers.find((h) => h.canHandle(modelId));

    if (!handler) {
      throw new Error(`Unsupported model provider for modelId: ${modelId}`);
    }

    const body = handler.buildBody(this.systemPrompt, userPrompt);

    const command = new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body,
    });

    const response = await this.client.send(command);
    const decodedBody = new TextDecoder().decode(response.body);
    const responseBody = JSON.parse(decodedBody);

    return handler.parseResponse(responseBody);
  }

  async tagArticlesIndividually(
    newsData: NewsResponse,
  ): Promise<TaggedNewsResponse> {
    const taggedArticles: TaggedNewsArticle[] = [];

    for (let i = 0; i < newsData.articles.length; i++) {
      const article = newsData.articles[i];
      console.log(
        `Processing article ${i + 1}/${newsData.articles.length}: ${
          article.title
        }`,
      );

      // Derive Unix timestamp (seconds) when publishedAt is a valid date (once per article)
      const timeMs = Date.parse(article.publishedAt);
      const hasValidDate = !Number.isNaN(timeMs);
      const publishedAtTs = hasValidDate ? Math.floor(timeMs / 1000) : undefined;

      try {
        const tags = await this.tagSingleArticle(article);
        console.log(`>>>> ${tags.join(", ")}`);

        taggedArticles.push(
          publishedAtTs !== undefined
            ? { ...article, tags, publishedAtTs }
            : { ...article, tags },
        );

        if (i < newsData.articles.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error processing article "${article.title}":`, error);
        taggedArticles.push(
          publishedAtTs !== undefined
            ? { ...article, tags: [], publishedAtTs }
            : { ...article, tags: [] },
        );
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
          "amazon.nova-lite-v1:0",
        );
        return this.parseTagsFromResponse(responseText);
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          (error as { name?: unknown }).name === "ThrottlingException" &&
          attempt < maxRetries - 1
        ) {
          console.warn(
            `Throttling detected. Retrying in ${delay / 1000}s... (Attempt ${
              attempt + 1
            }/${maxRetries})`,
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
    throw new Error(
      `Max retries reached for tagging article: ${article.title}`,
    );
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
      category.tags.map((tag) => tag.id),
    );

    try {
      const raw = parseJsonArrayFromModelResponse(responseText);
      if (raw.length === 0 && validTags.includes("off_topic")) {
        return ["off_topic"];
      }
      const filtered = raw.filter(
        (tag): tag is string => typeof tag === "string" && validTags.includes(tag),
      );
      return filtered.slice(0, this.maxTags); // cap at configured max
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
  // Instantiate the tagger
  const tagger = await NewsArticleTagger.create(
    tagDefinitions as TagDefinition,
  );

  // Find untagged files
  await fs.mkdir(TAGGED_NEWS_DIR, { recursive: true });
  const rawFiles = await fs.readdir(RAW_NEWS_DIR);
  const taggedFiles = new Set(await fs.readdir(TAGGED_NEWS_DIR));
  const untaggedFiles = rawFiles.filter(
    (file) => !taggedFiles.has(file) && file.endsWith(".json"),
  );

  if (untaggedFiles.length === 0) {
    console.log("All news files are already tagged. Nothing to do.");
    return;
  }

  console.log(
    `Found ${
      untaggedFiles.length
    } untagged news file(s): ${untaggedFiles.join(", ")}. Starting process...`,
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
          `Removed ${duplicateCount}/${originalCount} duplicate/similar articles.`,
        );
      }

      if (newsData.articles.length === 0) {
        console.log("No unique articles to tag. Skipping.");
        await fs.writeFile(
          taggedFilePath,
          JSON.stringify({ ...newsData, articles: [] }, null, 2),
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

if (require.main === module) {
  main()
    .then(() => console.log("Done"))
    .catch(console.error);
}

export { NewsArticleTagger };
export type { TagDefinition, TaggedNewsResponse };
