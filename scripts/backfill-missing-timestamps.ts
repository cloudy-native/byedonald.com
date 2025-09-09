import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as dotenv from "dotenv";
import type { TaggedNewsResponse } from "./lib/article-utils";

// Load env for consistency with other scripts (not strictly required here)
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function backfillMissingTimestamps() {
  console.log("Starting backfill of publishedAtTs for tagged files...");

  const TAGGED_NEWS_DIR = path.join(__dirname, "..", "data", "news", "tagged");

  try {
    const entries = await fs.readdir(TAGGED_NEWS_DIR);
    const jsonFiles = entries.filter((f) => f.endsWith(".json"));

    if (jsonFiles.length === 0) {
      console.log("No tagged files found. Nothing to do.");
      return;
    }

    console.log(`Found ${jsonFiles.length} tagged files to scan.`);
    let totalFilesUpdated = 0;
    let totalArticlesUpdated = 0;

    for (const fileName of jsonFiles) {
      const filePath = path.join(TAGGED_NEWS_DIR, fileName);
      try {
        const json = await fs.readFile(filePath, "utf-8");
        const data: TaggedNewsResponse = JSON.parse(json);

        if (!data.articles || data.articles.length === 0) continue;

        let updatedInFile = 0;
        for (const article of data.articles) {
          if (article.publishedAtTs == null && article.publishedAt) {
            const timeMs = Date.parse(article.publishedAt);
            if (!Number.isNaN(timeMs)) {
              article.publishedAtTs = Math.floor(timeMs / 1000);
              updatedInFile += 1;
            }
          }
        }

        if (updatedInFile > 0) {
          await fs.writeFile(filePath, JSON.stringify(data, null, 2));
          totalFilesUpdated += 1;
          totalArticlesUpdated += updatedInFile;
          console.log(`-> Updated ${fileName}: added timestamps to ${updatedInFile} article(s).`);
        }
      } catch (err) {
        console.error(`Failed to process ${fileName}:`, err);
      }
    }

    console.log(
      `Backfill complete. Files updated: ${totalFilesUpdated}, articles updated: ${totalArticlesUpdated}.`,
    );
  } catch (error) {
    console.error("An error occurred during the backfill process:", error);
  }
}

backfillMissingTimestamps()
  .then(() => console.log("Backfill script finished successfully."))
  .catch(console.error);
