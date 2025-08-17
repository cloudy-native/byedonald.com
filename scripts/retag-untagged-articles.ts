import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as dotenv from "dotenv";
import type { TaggedNewsResponse } from "./lib/article-utils";
import { NewsArticleTagger, type TagDefinition } from "./tag-news";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function retagMissingArticles() {
  console.log("Starting to re-tag articles with missing or empty tags...");

  const TAGS_FILE_PATH = path.join(
    __dirname,
    "..",
    "data",
    "tags",
    "tags.json",
  );
  const TAGGED_NEWS_DIR = path.join(__dirname, "..", "data", "news", "tagged");

  try {
    const tagDefinitions: TagDefinition = JSON.parse(
      await fs.readFile(TAGS_FILE_PATH, "utf8"),
    );
    const tagger = await NewsArticleTagger.create(tagDefinitions);

    const taggedFiles = await fs.readdir(TAGGED_NEWS_DIR);
    const jsonFiles = taggedFiles.filter((file) => file.endsWith(".json"));

    if (jsonFiles.length === 0) {
      console.log("No tagged files found. Nothing to do.");
      return;
    }

    console.log(`Found ${jsonFiles.length} tagged files to scan.`);
    let totalRetagged = 0;

    for (const fileName of jsonFiles) {
      const filePath = path.join(TAGGED_NEWS_DIR, fileName);
      let fileWasModified = false;
      let articlesRetaggedInFile = 0;

      try {
        const jsonString = await fs.readFile(filePath, "utf-8");
        const newsData: TaggedNewsResponse = JSON.parse(jsonString);

        if (!newsData.articles || newsData.articles.length === 0) continue;

        for (const article of newsData.articles) {
          const needsRetagging =
            !article.tags ||
            article.tags.length === 0 ||
            (article.tags.length === 1 && article.tags[0] === "untagged");
          if (needsRetagging) {
            console.log(
              `- Retagging article in ${fileName}: "${article.title}"`,
            );
            try {
              const newTags = await tagger.tagSingleArticle(article);
              if (newTags.length > 0) {
                article.tags = newTags;
                fileWasModified = true;
                articlesRetaggedInFile++;
                console.log(`  - Success! Tags: [${newTags.join(", ")}]`);
              } else {
                console.log(`  - AI returned no tags for "${article.title}"`);
              }
              // Small delay to be respectful to the API
              await new Promise((resolve) => setTimeout(resolve, 200));
            } catch (error) {
              console.error(
                `  - Failed to call AI for "${article.title}":`,
                error,
              );
            }
          }
        }

        if (fileWasModified) {
          totalRetagged += articlesRetaggedInFile;
          await fs.writeFile(filePath, JSON.stringify(newsData, null, 2));
          console.log(
            `-> Updated ${fileName} with ${articlesRetaggedInFile} new tag sets.`,
          );
        }
      } catch (error) {
        console.error(`Failed to process ${fileName}:`, error);
      }
    }

    console.log(
      `Retagging complete. Total articles updated: ${totalRetagged}.`,
    );
  } catch (error) {
    console.error("An error occurred during the retagging process:", error);
  }
}

retagMissingArticles()
  .then(() => console.log("Retagging script finished successfully."))
  .catch(console.error);
