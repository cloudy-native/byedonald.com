import { Client } from '@opensearch-project/opensearch';
import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT;
const INDEX_NAME = 'news-articles';
const TAGGED_NEWS_DIR = path.join(__dirname, '../data/news/tagged');

interface Article {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
  tags: string[];
}

/**
 * Creates the dataset for the OpenSearch bulk helper.
 * @param {Article[]} articles - The articles to format.
 * @param {string} date - The date of the news, extracted from the filename.
 * @returns {any[]} The dataset array for the bulk operation.
 */
const createBulkDataset = (articles: Article[], date: string): any[] => {
  const dataset: any[] = [];
  articles.forEach(article => {
    const documentId = Buffer.from(article.url).toString('base64');
    dataset.push({ index: { _id: documentId } });
    dataset.push({ ...article, news_date: date });
  });
  return dataset;
};

/**
 * Main function to read files, create payloads, and upload to OpenSearch.
 */
const uploadData = async () => {
  if (!OPENSEARCH_ENDPOINT) {
    console.error('Error: OPENSEARCH_ENDPOINT environment variable is not set.');
    console.error('Please set it to your AWS OpenSearch Serverless collection endpoint URL.');
    process.exit(1);
  }

  // The client will automatically use AWS credentials from the environment
  const client = new Client({
    node: OPENSEARCH_ENDPOINT,
  });

  try {
    console.log(`Reading files from: ${TAGGED_NEWS_DIR}`);
    const files = fs.readdirSync(TAGGED_NEWS_DIR).filter(file => file.endsWith('.json'));
    console.log(`Found ${files.length} tagged news files to upload.`);

    for (const file of files) {
      const filePath = path.join(TAGGED_NEWS_DIR, file);
      const date = path.basename(file, '.json');
      console.log(`\nProcessing ${file}...`);

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      const articles: Article[] = data.articles;

      if (articles.length === 0) {
        console.log('No articles in this file, skipping.');
        continue;
      }

      const dataset = createBulkDataset(articles, date);

      console.log(`Uploading ${articles.length} articles to index '${INDEX_NAME}'...`);

      const bulkResponse = await client.bulk({ body: dataset });

      if (bulkResponse.body.errors) {
        console.error('Bulk upload had errors:', JSON.stringify(bulkResponse.body.items, null, 2));
        throw new Error('Failed to upload some items.');
      }

      console.log(`Successfully uploaded articles from ${file}.`);
    }
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    process.exit(1);
  }
};

uploadData().then(() => {
  console.log('Upload process completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('An unexpected error occurred:', error);
  process.exit(1);
});

