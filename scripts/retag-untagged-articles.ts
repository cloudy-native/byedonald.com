import * as fs from 'fs/promises';
import * as path from 'path';
import { NewsArticleTagger, TagDefinition } from './tag-news';
import type { TaggedNewsResponse, TaggedNewsArticle } from './lib/article-utils';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function retagMissingArticles() {
  console.log('Starting to re-tag articles with missing or empty tags...');

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set in the environment variables.');
  }

  const TAGS_FILE_PATH = path.join(__dirname, '..', 'data', 'tags', 'tags.json');
  const TAGGED_NEWS_DIR = path.join(__dirname, '..', 'data', 'news', 'tagged');

  try {
    const tagDefinitions: TagDefinition = JSON.parse(await fs.readFile(TAGS_FILE_PATH, 'utf8'));
    const tagger = new NewsArticleTagger(ANTHROPIC_API_KEY, tagDefinitions);

    const taggedFiles = await fs.readdir(TAGGED_NEWS_DIR);
    const jsonFiles = taggedFiles.filter(file => file.endsWith('.json'));

    if (jsonFiles.length === 0) {
      console.log('No tagged files found. Nothing to do.');
      return;
    }

    console.log(`Found ${jsonFiles.length} tagged files to scan.`);
    let totalRetagged = 0;

    for (const fileName of jsonFiles) {
      const filePath = path.join(TAGGED_NEWS_DIR, fileName);
      let fileWasModified = false;
      let articlesRetaggedInFile = 0;

      try {
        const jsonString = await fs.readFile(filePath, 'utf-8');
        const newsData: TaggedNewsResponse = JSON.parse(jsonString);

        if (!newsData.articles || newsData.articles.length === 0) continue;

        for (const article of newsData.articles) {
          const needsRetagging = !article.tags || article.tags.length === 0 || (article.tags.length === 1 && article.tags[0] === 'untagged');
          if (needsRetagging) {
            console.log(`- Retagging article in ${fileName}: "${article.title}"`);
            try {
              const newTags = await tagger.tagSingleArticle(article);
              if (newTags.length > 0) {
                article.tags = newTags;
                fileWasModified = true;
                articlesRetaggedInFile++;
                console.log(`  - Success! Tags: [${newTags.join(', ')}]`);
              } else {
                console.log(`  - AI returned no tags for "${article.title}"`);
              }
              // Small delay to be respectful to the API
              await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
              console.error(`  - Failed to call AI for "${article.title}":`, error);
            }
          }
        }

        if (fileWasModified) {
          totalRetagged += articlesRetaggedInFile;
          await fs.writeFile(filePath, JSON.stringify(newsData, null, 2));
          console.log(`-> Updated ${fileName} with ${articlesRetaggedInFile} new tag sets.\n`);
        }
      } catch (error) {
        console.error(`Failed to process ${fileName}:`, error);
      }
    }

    console.log(`\nRetagging complete. Total articles updated: ${totalRetagged}.`);
  } catch (error) {
    console.error('An error occurred during the retagging process:', error);
  }
}

retagMissingArticles()
  .then(() => console.log('Retagging script finished successfully.'))
  .catch(console.error);

