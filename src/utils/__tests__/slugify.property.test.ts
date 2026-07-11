import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { slugify } from "../slugify";

/**
 * Feature: gatsby-to-astro-shadcn-migration
 * Property 1: Slugify produces valid URL slugs
 * Property 2: Slugify is idempotent
 *
 * Validates: Requirements 3.2, 3.3
 */

const VALID_SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe("slugify property tests", () => {
  it("Property 1: Slugify produces valid URL slugs", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (input) => {
          const result = slugify(input);
          // Result is either empty (input had no alphanumeric chars) or a valid slug
          if (result === "") {
            // Verify input truly has no alphanumeric characters
            expect(input.replace(/[^a-zA-Z0-9]/g, "")).toBe("");
          } else {
            expect(result).toMatch(VALID_SLUG_REGEX);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 2: Slugify is idempotent", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const once = slugify(input);
        const twice = slugify(once);
        expect(twice).toBe(once);
      }),
      { numRuns: 100 },
    );
  });
});
