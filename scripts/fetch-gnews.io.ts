import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// --- TYPE DEFINITIONS ---

// The format we get from gnews.io
interface GNewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

interface GNewsResponse {
  totalArticles: number;
  articles: GNewsArticle[];
}

// The format we want to save (matches newsapi.org)
interface NewsApiArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string;
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

/**
 * Transforms the gnews.io API response to the newsapi.org format.
 * @param {GNewsResponse} gnewsData - The raw data from the gnews.io API.
 * @returns {NewsApiResponse} The transformed data.
 */
function transformGNewsResponse(gnewsData: GNewsResponse): NewsApiResponse {
  const transformedArticles: NewsApiArticle[] = gnewsData.articles.map(article => ({
    source: {
      id: null, // gnews.io does not provide a source ID
      name: article.source.name,
    },
    author: article.source.name, // Use source name as a fallback for author
    title: article.title,
    description: article.description,
    url: article.url,
    urlToImage: article.image,
    publishedAt: article.publishedAt,
    content: article.content,
  }));

  return {
    status: 'ok',
    totalResults: gnewsData.totalArticles,
    articles: transformedArticles,
  };
}

/**
 * Fetches news for a specific date from gnews.io and saves it in newsapi.org format.
 * @param {string} newsDate - The date to fetch news for, in YYYY-MM-DD format.
 * @param {string} topic - The topic to search for.
 */
export async function fetchNewsForDate(newsDate: string, topic: string = 'trump') {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) {
    throw new Error('GNEWS_API_KEY environment variable not set.');
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(newsDate)) {
    throw new Error(`Invalid date format: ${newsDate}. Please use YYYY-MM-DD.`);
  }

  const from = `${newsDate}T00:00:00Z`;
  const to = `${newsDate}T23:59:59Z`;

  const url = `https://gnews.io/api/v4/search?q=${topic}&from=${from}&to=${to}&lang=en&max=100&apikey=${apiKey}`;
  console.log(`Fetching from URL: ${url.replace(apiKey, 'REDACTED_API_KEY')}`);

  try {
    const response = await axios.get<GNewsResponse>(url);
    console.log('--- Raw gnews.io Response ---');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('-----------------------------');

    const transformedData = transformGNewsResponse(response.data);

    const dataDir = path.join(__dirname, '..', 'data', 'news', 'raw');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const filePath = path.join(dataDir, `${newsDate}.json`);
    fs.writeFileSync(filePath, JSON.stringify(transformedData, null, 2));

    console.log(
      `Successfully fetched and saved news for ${newsDate} from gnews.io to ${filePath}`
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        `Error fetching news for ${newsDate} from gnews.io:`,
        error.response?.data || error.message
      );
    } else {
      console.error(`An unexpected error occurred while fetching for ${newsDate}:`, error);
    }
    throw error; // Re-throw the error so the caller can handle it
  }
}

// This block allows the script to be run directly from the command line
if (require.main === module) {
  const newsDateArg = process.argv[2];
  const topicArg = process.argv[3]; // Optional topic

  if (!newsDateArg) {
    console.error('Usage: ts-node scripts/fetch-gnews.io.ts <YYYY-MM-DD> [topic]');
    process.exit(1);
  }

  fetchNewsForDate(newsDateArg, topicArg).catch((err) => {
    console.error('Script failed unexpectedly. Error:', err);
    process.exit(1);
  });
}
