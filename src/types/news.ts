export interface Source {
  id: string | null;
  name: string;
}

export interface Article {
  source: Source;
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
  tags: string[];
}

export interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: Article[];
}
