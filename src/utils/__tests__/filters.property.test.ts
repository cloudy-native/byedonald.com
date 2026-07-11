import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { filterOffTopic } from "../filters";
import type { Article } from "../../types/news";

/**
 * Feature: gatsby-to-astro-shadcn-migration, Property 3: Off-topic article filtering
 *
 * Validates: Requirements 2.4, 3.5
 */

/**
 * Arbitrary that generates a valid Article object.
 * The `tags` parameter allows controlling which tags appear on the article.
 */
function articleArbitrary(tags: fc.Arbitrary<string[]>): fc.Arbitrary<Article> {
  return fc.record({
    source: fc.record({
      id: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
      name: fc.string({ minLength: 1, maxLength: 50 }),
    }),
    author: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.option(fc.string({ minLength: 0, maxLength: 200 }), {
      nil: null,
    }),
    url: fc.webUrl(),
    urlToImage: fc.option(fc.webUrl(), { nil: null }),
    publishedAt: fc.date().map((d) => d.toISOString()),
    content: fc.option(fc.string({ minLength: 0, maxLength: 500 }), {
      nil: null,
    }),
    tags: tags,
    publishedAtTs: fc.integer({ min: 0, max: 2000000000 }),
  });
}

/** Generate a tag that is NOT "off_topic" */
const nonOffTopicTag = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((t) => t !== "off_topic");

/** Generate an article that does NOT have "off_topic" in tags */
const onTopicArticle = articleArbitrary(
  fc.array(nonOffTopicTag, { minLength: 0, maxLength: 5 }),
);

/** Generate an article that DOES have "off_topic" in tags */
const offTopicArticle = articleArbitrary(
  fc
    .array(nonOffTopicTag, { minLength: 0, maxLength: 4 })
    .map((tags) => [...tags, "off_topic"]),
);

describe("filterOffTopic property tests", () => {
  it("Property 3: Off-topic article filtering", () => {
    fc.assert(
      fc.property(
        fc.array(onTopicArticle, { minLength: 0, maxLength: 10 }),
        fc.array(offTopicArticle, { minLength: 0, maxLength: 10 }),
        (onTopicArticles, offTopicArticles) => {
          const allArticles = [...onTopicArticles, ...offTopicArticles];
          const result = filterOffTopic(allArticles);

          // Filtered result contains zero articles with "off_topic"
          for (const article of result) {
            expect(article.tags).not.toContain("off_topic");
          }

          // Filtered result retains ALL non-off-topic articles
          expect(result.length).toBe(onTopicArticles.length);

          // Every on-topic article is present in the result
          for (const article of onTopicArticles) {
            expect(result).toContain(article);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
