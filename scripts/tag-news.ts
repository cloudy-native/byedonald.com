import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs/promises";
import * as path from 'path';
import { deduplicateArticles } from './lib/article-utils';
import type { NewsArticle, TaggedNewsArticle, NewsResponse, TaggedNewsResponse } from './lib/article-utils';

interface Tag {
  id: string;
  name: string;
  description: string;
}

interface TagCategory {
  name: string;
  description: string;
  color: string;
  tags: Tag[];
}

interface TagDefinition {
  tagCategories: Record<string, TagCategory>;
}



class NewsArticleTagger {
  private client: Anthropic;
  private tagDefinitions: TagDefinition;

  constructor(apiKey: string, tagDefinitions: TagDefinition) {
    this.client = new Anthropic({ apiKey });
    this.tagDefinitions = tagDefinitions;
  }

  // Method 1: Process all articles in a single batch
  async tagArticlesBatch(newsData: NewsResponse): Promise<TaggedNewsResponse> {
    const prompt = this.createBatchPrompt(newsData.articles);

    try {
      const response = await this.client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude");
      }

      const taggedArticles = this.parseTaggedArticles(
        content.text,
        newsData.articles
      );

      return {
        status: newsData.status,
        totalResults: newsData.totalResults,
        articles: taggedArticles,
      };
    } catch (error) {
      console.error("Error in batch processing:", error);
      throw error;
    }
  }

  // Method 2: Process articles one by one
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

        // Add a small delay to be respectful to the API
        if (i < newsData.articles.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error processing article "${article.title}":`, error);
        // Add article with empty tags if individual processing fails
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

    console.log("####################");
    console.log(prompt);
    console.log("####################");

    const response = await this.client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    return this.parseTagsFromResponse(content.text);
  }

  private createBatchPrompt(articles: NewsArticle[]): string {
    const tagDefinitionsText = this.formatTagDefinitions();

    return `You are a news article classifier. Your task is to assign relevant topic tags to news articles based on the provided tag definitions.

TAG DEFINITIONS:
${tagDefinitionsText}

INSTRUCTIONS:
1. Analyze each article's title, description, and content
2. Assign 1-5 relevant tags from the available tag definitions
3. Only use tags that are defined in the tag definitions above
4. Return the results as a JSON array where each object contains an "index" (0-based position) and "tags" (array of tag names)

ARTICLES TO TAG:
${articles
  .map(
    (article, index) => `
Article ${index}:
Title: ${article.title}
Description: ${article.description}
Content: ${article.content}
`
  )
  .join("\n")}

Return your response as a JSON array in this exact format:
[
  {"index": 0, "tags": ["tag1", "tag2"]},
  {"index": 1, "tags": ["tag3", "tag4"]},
  ...
]`;
  }

  private createSingleArticlePrompt(article: NewsArticle): string {
    const tagDefinitionsText = this.formatTagDefinitions();

    return `You are a news article classifier. Your task is to assign relevant topic tags to this news article based on the provided tag definitions.

TAG DEFINITIONS:
${tagDefinitionsText}

ARTICLE TO TAG:
Title: ${article.title}
Description: ${article.description}
Content: ${article.content}

INSTRUCTIONS:
1. Analyze the article's title, description, and content.
2. Assign 1-5 relevant tags from the available tag definitions.
3. Only use tags that are defined in the tag definitions above.
4. The tag ID is the value before the colon (e.g., \`taxes\` in \`taxes: Tax policy...\`).
5. Return ONLY a JSON array of the chosen tag IDs.

Return your response as a JSON array of tag IDs:
["tag_id_1", "tag_id_2", "tag_id_3"]`;
  }

  private formatTagDefinitions(): string {
    let formatted = "";
    for (const [categoryKey, categoryData] of Object.entries(
      this.tagDefinitions.tagCategories
    )) {
      formatted += `\n${categoryKey.toUpperCase()}: ${categoryData.description}\n`;
      for (const tag of categoryData.tags) {
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
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
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
      // Return articles with empty tags if parsing fails
      return originalArticles.map((article) => ({ ...article, tags: [] }));
    }
  }

  private parseTagsFromResponse(response: string): string[] {
    try {
      // Extract JSON array from response
      const jsonMatch = response.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("Error parsing tags from response:", error);
      return [];
    }
  }
}

// Usage example
async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  // --- CONFIGURATION ---
  const RAW_NEWS_DIR = path.join(__dirname, '..', 'data', 'news', 'raw');
  const TAGGED_NEWS_DIR = path.join(__dirname, '..', 'data', 'news', 'tagged');
  const TAGS_FILE_PATH = path.join(__dirname, '..', 'data', 'tags', 'tags.json');

  // Load tag definitions
  const tagDefinitions: TagDefinition = JSON.parse(
    await fs.readFile(TAGS_FILE_PATH, 'utf8')
  );

  // Instantiate the tagger
  const tagger = new NewsArticleTagger(apiKey, tagDefinitions);

  // Find untagged files
  await fs.mkdir(TAGGED_NEWS_DIR, { recursive: true });
  const rawFiles = await fs.readdir(RAW_NEWS_DIR);
  const taggedFiles = new Set(await fs.readdir(TAGGED_NEWS_DIR));
  const untaggedFiles = rawFiles.filter(
    file => !taggedFiles.has(file) && file.endsWith('.json')
  );

  if (untaggedFiles.length === 0) {
    console.log('All news files are already tagged. Nothing to do.');
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
      const rawJsonString = await fs.readFile(rawFilePath, 'utf-8');
      const newsData: NewsResponse = JSON.parse(rawJsonString);

      // Deduplicate articles before tagging
      const originalCount = newsData.articles.length;
      newsData.articles = deduplicateArticles(newsData.articles);
      newsData.totalResults = newsData.articles.length;
      const duplicateCount = originalCount - newsData.totalResults;
      if (duplicateCount > 0) {
        console.log(`Removed ${duplicateCount}/${originalCount} duplicate/similar articles.`);
      }

      if (newsData.articles.length === 0) {
        console.log('No unique articles to tag. Skipping.');
        // Optional: create an empty tagged file
        await fs.writeFile(taggedFilePath, JSON.stringify({ ...newsData, articles: [] }, null, 2));
        console.log(`Created empty tagged file: ${fileName}`);
        continue; // Skip to the next file
      }

      // const taggedResult = await tagger.tagArticlesBatch(newsData);
      const taggedResult = await tagger.tagArticlesIndividually(newsData);

      await fs.writeFile(
        taggedFilePath,
        JSON.stringify(taggedResult, null, 2)
      );
      console.log(`Successfully tagged and saved: ${fileName}`);
    } catch (error) {
      console.error(`Failed to process ${fileName}:`, error);
      // Continue to the next file
    }
    console.log(`--- Finished: ${fileName} ---\n`);
  }

  console.log('Tagging process completed.');
}

main()
  .then(() => console.log("Done"))
  .catch(console.error);

export { NewsArticleTagger };
export type { TaggedNewsResponse, TagDefinition };
