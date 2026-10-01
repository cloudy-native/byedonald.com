import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as dotenv from "dotenv";
import tagDefinitions from "../data/tags/tags.json";
import type {
  NewsArticle,
  NewsResponse,
  TaggedNewsArticle,
  TaggedNewsResponse,
} from "./lib/article-utils";
import { deduplicateArticles } from "./lib/article-utils";

const JEV_URL = "https://api.typesafe.ai/v1/systemone";
const TAG_CUTOFF = 0.7;
const CONTENT_LIMIT = 1800;

const SKIPPED_TAG_IDS = new Set(["international_crisis"]);

const PARENT_TAG_IDS = new Set([
  "trump",
  "leadership",
  "government_administration",
  "policy_legislation",
  "economy_finance",
  "foreign_policy",
  "legal_justice",
  "elections_politics",
  "media_communications",
  "security_intelligence",
  "social_issues",
  "health_science",
  "personal_family",
  "regional_state",
  "crisis_emergency",
]);

const PLACE_TAG_IDS = new Set([
  "florida",
  "new_york",
  "washington_dc",
  "california",
  "texas",
  "swing_states",
]);

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

interface JevNoul {
  type?: string;
  noul?: number;
}

function instructionFor(tag: Tag): string {
  if (tag.id === "off_topic") {
    return "Is this article without a real connection to Donald Trump, his family, his businesses, his administration, his campaigns, or a federal decision? Answer no if the title or text contains Lake America, the Kennedy Center, super intelligence, or the US-Iran war, even when the rest is about Apple, a cartoon, or a product. Answer no for a federal agency action, a bill in Congress, or a court case about administration policy. A sports result, a viral video, or celebrity news with no federal decision is off-topic. State politics are off-topic.";
  }
  if (tag.id === "vanity") {
    return "Answer yes if the title or text contains Lake America, New America, super intelligence, or Trump Strait, including an Apple Maps label or a cartoon about those names. The abbreviation SI used as a correction for AI, as in 'AI, or SI', is super intelligence and is yes. A joke or cartoon whose point is Trump's renames is yes. Answer yes for a Kennedy Center closure, board vote, court filing, or fight over its name. A ceiling collapse reported on its own, with no closure vote, is no. An ordinary CEO or product story that does not use one of those names is no.";
  }
  if (tag.id === "us_iran_war") {
    return "Answer yes if the title or text is about the war between the United States and Iran, including the words Iran war or US-Iran war, a country described as trapped in that war, satire about that war, fighting, Hormuz tanker attacks, ceasefire talks, costs, or munitions. Sanctions and nuclear inspections are no unless they are about the fighting.";
  }
  if (tag.id === "energy") {
    return "Answer yes if the title is about fuel-economy standards, gas prices, oil, or energy policy, even when the body is a different brief in a news roundup. Also yes for a full article about oil, gas, renewables, or vehicle efficiency. Yes only when that is a real subject, not a passing mention.";
  }
  if (tag.id === "personnel") {
    return "Does this article substantially concern a federal or administration personnel change: Cabinet, White House, agency heads, senior military, or the head of a federal institution such as the Smithsonian? A corporate CEO or private-sector resignation does not qualify. Yes only when the article is clearly about this, not a passing mention.";
  }
  if (tag.id === "national_security") {
    return "Does this article substantially concern national-security strategy, threats, or military operations? A resignation or appointment does not qualify. Yes only when the article is clearly about this, not a passing mention.";
  }
  if (PLACE_TAG_IDS.has(tag.id)) {
    return `Does this article substantially concern ${tag.name} itself (${tag.description})? The place qualifies only when the story is about that place, such as its election, law, or governance. A press conference or visit that merely happens there does not qualify.`;
  }
  return `Does this article substantially match the tag "${tag.id}" (${tag.name}): ${tag.description}? Yes only when the article is clearly about this topic, not a passing mention.`;
}

export function selectTags(
  scores: Record<string, number>,
  maxTags: number,
  cutoff = TAG_CUTOFF,
): string[] {
  if ((scores.off_topic ?? 0) >= cutoff) return ["off_topic"];
  const ranked = (parent: boolean) =>
    Object.entries(scores)
      .filter(
        ([id, probability]) =>
          id !== "off_topic" &&
          PARENT_TAG_IDS.has(id) === parent &&
          probability >= cutoff,
      )
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([id]) => id);
  return [...ranked(false), ...ranked(true)].slice(0, maxTags);
}

class NewsArticleTagger {
  private maxTags: number;
  private apiKey: string;
  private questions: Record<string, { type: "noul"; instructions: string }>;

  private constructor(
    tagDefinitions: TagDefinition,
    maxTags: number,
    apiKey: string,
  ) {
    this.maxTags = maxTags;
    this.apiKey = apiKey;
    this.questions = {};
    for (const category of tagDefinitions) {
      for (const tag of category.tags) {
        if (SKIPPED_TAG_IDS.has(tag.id)) continue;
        this.questions[tag.id] = {
          type: "noul",
          instructions: instructionFor(tag),
        };
      }
    }
  }

  public static async create(
    tagDefinitions: TagDefinition,
  ): Promise<NewsArticleTagger> {
    dotenv.config({ path: path.join(__dirname, "..", ".env") });
    const apiKey = process.env.JEV_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("JEV_API_KEY is missing");
    }
    const maxTagsEnv = Number(process.env.MAX_TAGS);
    const maxTags =
      Number.isFinite(maxTagsEnv) && maxTagsEnv > 0 ? maxTagsEnv : 5;
    return new NewsArticleTagger(tagDefinitions, maxTags, apiKey);
  }

  async tagArticlesIndividually(
    newsData: NewsResponse,
  ): Promise<TaggedNewsResponse> {
    const taggedArticles: TaggedNewsArticle[] = [];

    for (let i = 0; i < newsData.articles.length; i++) {
      const article = newsData.articles[i];
      console.log(
        `Processing article ${i + 1}/${newsData.articles.length}: ${article.title}`,
      );

      const timeMs = Date.parse(article.publishedAt);
      const hasValidDate = !Number.isNaN(timeMs);
      const publishedAtTs = hasValidDate
        ? Math.floor(timeMs / 1000)
        : undefined;

      try {
        const tags = await this.tagSingleArticle(article);
        console.log(`>>>> ${tags.join(", ")}`);
        taggedArticles.push(
          publishedAtTs !== undefined
            ? { ...article, tags, publishedAtTs }
            : { ...article, tags },
        );
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
    const scores = await this.scoreArticle(article);
    return selectTags(scores, this.maxTags);
  }

  private articleState(article: NewsArticle): string {
    const content = (article.content || "No content available.").slice(
      0,
      CONTENT_LIMIT,
    );
    return [
      "Archive scope: Donald Trump, his administration, campaigns, businesses, legal matters, US national politics, and the US-Iran war.",
      "The title and description are the article. Ignore content that is a list of unrelated headlines or a later item in a roundup.",
      `Title: ${article.title}`,
      `Description: ${article.description || ""}`,
      `Content: ${content}`,
    ].join("\n");
  }

  private async scoreArticle(
    article: NewsArticle,
  ): Promise<Record<string, number>> {
    const maxRetries = 5;
    let delay = 1000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const response = await fetch(JEV_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "jev-latest",
          state: this.articleState(article),
          questions: this.questions,
        }),
      });

      if (response.status === 429 || response.status >= 500) {
        if (attempt === maxRetries - 1) break;
        console.warn(
          `Jev returned ${response.status}. Retrying in ${delay / 1000}s... (Attempt ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Jev request failed: HTTP ${response.status} ${text.slice(0, 200)}`,
        );
      }

      const body = (await response.json()) as {
        answers?: Record<string, JevNoul>;
      };
      const scores: Record<string, number> = {};
      for (const [id, answer] of Object.entries(body.answers ?? {})) {
        if (typeof answer?.noul === "number") scores[id] = answer.noul;
      }
      return scores;
    }

    throw new Error(
      `Max retries reached for tagging article: ${article.title}`,
    );
  }
}

async function main() {
  const RAW_NEWS_DIR = path.join(__dirname, "..", "data", "news", "raw");
  const TAGGED_NEWS_DIR = path.join(__dirname, "..", "data", "news", "tagged");
  const tagger = await NewsArticleTagger.create(
    tagDefinitions as TagDefinition,
  );

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
    `Found ${untaggedFiles.length} untagged news file(s): ${untaggedFiles.join(", ")}. Starting process...`,
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
