import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  serializeFilters,
  deserializeFilters,
  type FilterState,
} from "../NewsDayFilters";

/**
 * Feature: gatsby-to-astro-shadcn-migration, Property 5: News-day filter state URL round-trip
 *
 * Validates: Requirements 4.3
 */

/**
 * Arbitrary for generating valid filter item strings.
 * Excludes commas (used as delimiter) and empty strings.
 */
const filterValueArb = fc
  .string({ minLength: 1 })
  .filter((s) => !s.includes(",") && s.length > 0);

const filterStateArb: fc.Arbitrary<FilterState> = fc.record({
  tags: fc.uniqueArray(filterValueArb, { maxLength: 5 }).map((arr) => new Set(arr)),
  sources: fc.uniqueArray(filterValueArb, { maxLength: 5 }).map((arr) => new Set(arr)),
  authors: fc.uniqueArray(filterValueArb, { maxLength: 5 }).map((arr) => new Set(arr)),
  order: fc.constantFrom("desc" as const, "asc" as const),
});

describe("NewsDayFilters property tests", () => {
  it("Property 5: Filter state URL round-trip — deserialize(serialize(state)) equals original state", () => {
    fc.assert(
      fc.property(filterStateArb, (state) => {
        const params = serializeFilters(state);
        const restored = deserializeFilters(params);

        expect(restored.tags).toEqual(state.tags);
        expect(restored.sources).toEqual(state.sources);
        expect(restored.authors).toEqual(state.authors);
        expect(restored.order).toBe(state.order);
      }),
      { numRuns: 100 },
    );
  });
});
