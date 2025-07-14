import * as Levenshtein from "fast-levenshtein";

const SIMILARITY_THRESHOLD = 10;

// --- SHARED TYPES ---

export interface NewsSource {
  id: string | null;
  name: string;
}

export interface NewsArticle {
  source: NewsSource;
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

export interface TaggedNewsArticle extends NewsArticle {
  tags: string[];
}

export interface NewsResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

export interface TaggedNewsResponse {
  status: string;
  totalResults: number;
  articles: TaggedNewsArticle[];
}

// --- REUSABLE FUNCTIONS ---

/**
 * Deduplicates an array of articles based on title similarity.
 * @param articles An array of articles (can be tagged or not).
 * @returns A new array with duplicate articles removed.
 *
 * We ued to check for desription too and make the threshold much larger. 
 * But AP news syndicates, for exmaple, often put their publication as a prefix 
 * and then it's not similar enough to be considered a duplicate, even though the title may be exact
 */
export function deduplicateArticles<T extends NewsArticle>(articles: T[]): T[] {
  const uniqueArticles: T[] = [];

  articles.forEach((article) => {
    if (!article.title) {
      return;
    }

    const currentArticleText = article.title.toLowerCase();

    let isDuplicate = false;
    for (const uniqueArticle of uniqueArticles) {
      const uniqueArticleText = uniqueArticle.title.toLowerCase();

      const distance = Levenshtein.get(currentArticleText, uniqueArticleText);

      if (distance < SIMILARITY_THRESHOLD) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      uniqueArticles.push(article);
    }
  });

  return uniqueArticles;
}
