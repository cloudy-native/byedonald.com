import * as Levenshtein from 'fast-levenshtein';

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
 * Deduplicates an array of articles based on title and description similarity.
 * @param articles An array of articles (can be tagged or not).
 * @returns A new array with duplicate articles removed.
 */
export function deduplicateArticles<T extends NewsArticle>(articles: T[]): T[] {
  const uniqueArticles: T[] = [];
  // Max Levenshtein distance to be considered a duplicate. A lower number means more strict.
  const SIMILARITY_THRESHOLD = 10;

  articles.forEach(article => {
    // Basic check for empty title or description
    if (!article.title || !article.description) {
      return;
    }

    const currentArticleText = (article.title + ' ' + article.description).toLowerCase();
    
    let isDuplicate = false;
    for (const uniqueArticle of uniqueArticles) {
      const uniqueArticleText = (uniqueArticle.title + ' ' + uniqueArticle.description).toLowerCase();
      
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
