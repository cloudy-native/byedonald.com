import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { z } from "zod";

/**
 * Feature: gatsby-to-astro-shadcn-migration, Property 4: Article schema validation round-trip
 *
 * Validates: Requirements 2.3
 */

// Duplicate the schema from src/content.config.ts since we can't import from astro:content in tests
const articleSchema = z.object({
  source: z.object({
    id: z.string().nullable(),
    name: z.string(),
  }),
  author: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  url: z.string(),
  urlToImage: z.string().nullable(),
  publishedAt: z.string(),
  content: z.string().nullable(),
  tags: z.array(z.string()),
  publishedAtTs: z.number(),
});

const newsFileSchema = z.object({
  status: z.string().optional(),
  totalResults: z.number().optional(),
  articles: z.array(articleSchema),
});

// Generator for valid article objects
const validArticleArb = fc.record({
  source: fc.record({
    id: fc.oneof(fc.string(), fc.constant(null)),
    name: fc.string(),
  }),
  author: fc.oneof(fc.string(), fc.constant(null)),
  title: fc.string(),
  description: fc.oneof(fc.string(), fc.constant(null)),
  url: fc.string(),
  urlToImage: fc.oneof(fc.string(), fc.constant(null)),
  publishedAt: fc.string(),
  content: fc.oneof(fc.string(), fc.constant(null)),
  tags: fc.array(fc.string()),
  publishedAtTs: fc.double({ noNaN: true, noDefaultInfinity: true }),
});

describe("Article schema validation property tests", () => {
  it("Property 4A: Valid article objects pass schema validation", () => {
    fc.assert(
      fc.property(validArticleArb, (article) => {
        const result = articleSchema.safeParse(article);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("Property 4B: Invalid objects with missing required fields are rejected", () => {
    const requiredFields = [
      "source",
      "author",
      "title",
      "description",
      "url",
      "urlToImage",
      "publishedAt",
      "content",
      "tags",
      "publishedAtTs",
    ] as const;

    fc.assert(
      fc.property(
        validArticleArb,
        fc.constantFrom(...requiredFields),
        (article, fieldToRemove) => {
          const invalidArticle = { ...article };
          delete (invalidArticle as Record<string, unknown>)[fieldToRemove];
          const result = articleSchema.safeParse(invalidArticle);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 4C: Invalid objects with wrong field types are rejected", () => {
    // Generate an article then corrupt one field with a wrong type
    const wrongTypeArb = fc.tuple(
      validArticleArb,
      fc.constantFrom(
        { field: "title", wrongValue: 123 },
        { field: "title", wrongValue: true },
        { field: "url", wrongValue: [] },
        { field: "publishedAt", wrongValue: 42 },
        { field: "tags", wrongValue: "not-an-array" },
        { field: "publishedAtTs", wrongValue: "not-a-number" },
        { field: "source", wrongValue: "not-an-object" },
        { field: "source", wrongValue: null },
        { field: "tags", wrongValue: [1, 2, 3] },
      ),
    );

    fc.assert(
      fc.property(wrongTypeArb, ([article, { field, wrongValue }]) => {
        const invalidArticle = { ...article, [field]: wrongValue };
        const result = articleSchema.safeParse(invalidArticle);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
