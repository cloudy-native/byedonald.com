import * as fs from 'fs/promises';
import * as path from 'path';
import { deduplicateArticles } from './lib/article-utils';
import type { TaggedNewsResponse } from './lib/article-utils';

async function pruneTaggedFiles() {
  console.log('Starting to prune duplicate articles from tagged files...');

  const TAGGED_NEWS_DIR = path.join(__dirname, '..', 'data', 'news', 'tagged');

  try {
    const taggedFiles = await fs.readdir(TAGGED_NEWS_DIR);
    const jsonFiles = taggedFiles.filter(file => file.endsWith('.json'));

    if (jsonFiles.length === 0) {
      console.log('No tagged files found. Nothing to do.');
      return;
    }

    console.log(`Found ${jsonFiles.length} tagged files to process.`);
    let totalPruned = 0;

    for (const fileName of jsonFiles) {
      const filePath = path.join(TAGGED_NEWS_DIR, fileName);
      try {
        const jsonString = await fs.readFile(filePath, 'utf-8');
        const newsData: TaggedNewsResponse = JSON.parse(jsonString);

        if (!newsData.articles) continue;

        const originalCount = newsData.articles.length;
        const prunedArticles = deduplicateArticles(newsData.articles);
        const newCount = prunedArticles.length;
        const prunedCount = originalCount - newCount;

        if (prunedCount > 0) {
          totalPruned += prunedCount;
          newsData.articles = prunedArticles;
          newsData.totalResults = newCount;

          await fs.writeFile(filePath, JSON.stringify(newsData, null, 2));
          console.log(`Pruned ${prunedCount} articles from ${fileName}.`);
        } else {
          // console.log(`No duplicates found in ${fileName}.`);
        }
      } catch (error) {
        console.error(`Failed to process ${fileName}:`, error);
      }
    }

    console.log(`\nPruning complete. Total articles pruned: ${totalPruned}.`);

  } catch (error) {
    console.error('An error occurred during the pruning process:', error);
  }
}

pruneTaggedFiles()
  .then(() => console.log('Pruning script finished.'))
  .catch(console.error);
