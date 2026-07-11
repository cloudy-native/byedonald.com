import type { Article } from "../types/news";

/**
 * Filters out articles tagged as "off_topic".
 * Used by all page generators (news day, tags, sources) to exclude
 * irrelevant content from the rendered site.
 */
export function filterOffTopic(articles: Article[]): Article[] {
  return articles.filter((article) => !article.tags.includes("off_topic"));
}
