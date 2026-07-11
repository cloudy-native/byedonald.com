import * as fs from "node:fs/promises";
import * as path from "node:path";
import { algoliasearch } from "algoliasearch";
import * as dotenv from "dotenv";

dotenv.config();

// --- Types ---

interface NewsSource {
  id: string | null;
  name: string;
}

interface TaggedArticle {
  source: NewsSource;
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
  tags: string[];
  publishedAtTs?: number;
}

interface TaggedNewsFile {
  status?: string;
  totalResults?: number;
  articles: TaggedArticle[];
}

interface AlgoliaRecord {
  objectID: string;
  title: string;
  description: string | null;
  author: string | null;
  url: string;
  urlToImage: string | null;
  sourceName: string | null;
  publishedAt: string;
  publishedAtTs: number | null;
  tags: string[];
}

// --- Configuration ---

const TAGGED_NEWS_DIR = path.join(__dirname, "..", "data", "news", "tagged");

const APP_ID = process.env.PUBLIC_ALGOLIA_APP_ID;
const API_KEY = process.env.ALGOLIA_API_KEY;
const INDEX_NAME = process.env.PUBLIC_ALGOLIA_INDEX_NAME;

// --- Helpers ---

function transformArticle(article: TaggedArticle): AlgoliaRecord {
  return {
    objectID: article.url,
    title: article.title,
    description: article.description,
    author: article.author,
    url: article.url,
    urlToImage: article.urlToImage,
    sourceName: article.source?.name ?? null,
    publishedAt: article.publishedAt,
    publishedAtTs: article.publishedAtTs ?? null,
    tags: article.tags,
  };
}

function isOnTopic(article: TaggedArticle): boolean {
  return !article.tags.includes("off_topic");
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const shouldPush = args.includes("--push");
  const isDryRun = !shouldPush;

  if (isDryRun) {
    console.log("🔍 DRY RUN mode (pass --push to actually push to Algolia)\n");
  }

  // Validate env vars for push mode
  if (shouldPush) {
    const missing: string[] = [];
    if (!APP_ID) missing.push("PUBLIC_ALGOLIA_APP_ID");
    if (!API_KEY) missing.push("ALGOLIA_API_KEY");
    if (!INDEX_NAME) missing.push("PUBLIC_ALGOLIA_INDEX_NAME");

    if (missing.length > 0) {
      console.error(
        `❌ Missing required environment variables: ${missing.join(", ")}`,
      );
      process.exit(1);
    }
  }

  // Read all tagged news JSON files
  console.log(`📂 Reading tagged news from: ${TAGGED_NEWS_DIR}`);
  const files = await fs.readdir(TAGGED_NEWS_DIR);
  const jsonFiles = files
    .filter((f) => f.endsWith(".json"))
    .sort();

  if (jsonFiles.length === 0) {
    console.log("No tagged news files found. Nothing to index.");
    return;
  }

  console.log(`📄 Found ${jsonFiles.length} tagged news files`);

  // Transform all articles into Algolia records
  const records: AlgoliaRecord[] = [];

  for (const fileName of jsonFiles) {
    const filePath = path.join(TAGGED_NEWS_DIR, fileName);
    const raw = await fs.readFile(filePath, "utf-8");
    const data: TaggedNewsFile = JSON.parse(raw);

    if (!data.articles || !Array.isArray(data.articles)) continue;

    const onTopicArticles = data.articles.filter(isOnTopic);
    const transformed = onTopicArticles.map(transformArticle);
    records.push(...transformed);
  }

  console.log(`✅ Transformed ${records.length} on-topic articles into Algolia records`);

  if (isDryRun) {
    // Show a sample of records
    console.log("\n📋 Sample records (first 3):");
    for (const record of records.slice(0, 3)) {
      console.log(JSON.stringify(record, null, 2));
    }
    console.log(
      `\n✅ Dry run complete. ${records.length} records would be pushed to index "${INDEX_NAME || "(not set)"}".`,
    );
    return;
  }

  // Push to Algolia
  console.log(`\n🚀 Pushing ${records.length} records to Algolia index "${INDEX_NAME}"...`);

  const client = algoliasearch(APP_ID!, API_KEY!);

  // Configure index settings matching the gatsby-plugin-algolia config
  console.log("⚙️  Configuring index settings...");
  await client.setSettings({
    indexName: INDEX_NAME!,
    indexSettings: {
      searchableAttributes: [
        "unordered(author)",
        "unordered(sourceName)",
        "unordered(title)",
        "unordered(description)",
      ],
      attributesForFaceting: [
        "searchable(author)",
        "searchable(sourceName)",
      ],
      customRanking: ["desc(publishedAt)"],
      attributesToSnippet: ["description:15", "content:20"],
      snippetEllipsisText: "…",
    },
  });
  console.log("✅ Index settings configured");

  // Push records in batches using saveObjects helper
  console.log("📤 Saving objects...");
  await client.saveObjects({
    indexName: INDEX_NAME!,
    objects: records as unknown as Array<Record<string, unknown>>,
    batchSize: 10000,
    waitForTasks: true,
  });

  console.log(`✅ Successfully pushed ${records.length} records to Algolia index "${INDEX_NAME}"`);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
