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

const VALID_SLUG_REGEX = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

describe("slugify property tests", () => {
  it("Property 1: Slugify produces valid URL slugs", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (input) => {
        const result = slugify(input);
        // Always non-empty (Astro rejects empty dynamic params)
        expect(result.length).toBeGreaterThan(0);
        expect(result).toMatch(VALID_SLUG_REGEX);
      }),
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

  it("preserves non-Latin source names instead of emptying them", () => {
    expect(slugify("코리아타임스")).toBe("코리아타임스");
    expect(slugify("!!!")).toBe("unknown");
    expect(slugify("The New York Times")).toBe("the-new-york-times");
  });
});
