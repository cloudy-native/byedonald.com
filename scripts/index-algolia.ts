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
  content: string | null;
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
    content: article.content,
  };
}

function isOnTopic(article: TaggedArticle): boolean {
  return !article.tags.includes("off_topic");
}

/**
 * Returns the URL of every record already in the index.
 *
 * Records are matched on `url`, not `objectID`: records written by the old
 * Gatsby build have UUID objectIDs, so saving them again keyed by URL would
 * duplicate them in search results.
 */
async function fetchIndexedUrls(
  client: ReturnType<typeof algoliasearch>,
  indexName: string,
): Promise<Set<string>> {
  const urls = new Set<string>();
  await client.browseObjects<{ url?: string }>({
    indexName,
    browseParams: { attributesToRetrieve: ["url"], hitsPerPage: 1000 },
    aggregator: (response) => {
      for (const hit of response.hits) {
        if (hit.url) urls.add(hit.url);
      }
    },
  });
  return urls;
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

  if (isDryRun && (!APP_ID || !API_KEY || !INDEX_NAME)) {
    console.log(
      `\n✅ Dry run complete. Algolia credentials not set, so the ${records.length} local records were not compared with the index.`,
    );
    return;
  }

  // Only send articles the index doesn't have yet
  const client = algoliasearch(APP_ID!, API_KEY!);
  console.log("🔎 Reading existing records from Algolia...");
  const indexedUrls = await fetchIndexedUrls(client, INDEX_NAME!);
  const newRecords = records.filter((record) => !indexedUrls.has(record.url));
  console.log(
    `✅ ${indexedUrls.size} URLs already indexed, ${newRecords.length} new records to push`,
  );

  if (isDryRun) {
    console.log("\n📋 Sample new records (first 3):");
    for (const record of newRecords.slice(0, 3)) {
      console.log(JSON.stringify(record, null, 2));
    }
    console.log(
      `\n✅ Dry run complete. ${newRecords.length} records would be pushed to index "${INDEX_NAME}".`,
    );
    return;
  }

  if (newRecords.length === 0) {
    console.log("Nothing new to index.");
    return;
  }

  // Push records in batches using saveObjects helper
  console.log(`\n📤 Saving ${newRecords.length} records to "${INDEX_NAME}"...`);
  await client.saveObjects({
    indexName: INDEX_NAME!,
    objects: newRecords as unknown as Array<Record<string, unknown>>,
    batchSize: 1000,
    waitForTasks: true,
  });

  console.log(`✅ Successfully pushed ${newRecords.length} records to Algolia index "${INDEX_NAME}"`);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
