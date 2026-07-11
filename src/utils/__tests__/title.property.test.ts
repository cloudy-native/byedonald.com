import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { getNewsDayTitle } from "../title";

/**
 * Feature: gatsby-to-astro-shadcn-migration
 * Property 6: News-day page title generation
 *
 * Validates: Requirements 9.4
 */

const VALID_WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const VALID_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Generates a valid YYYY-MM-DD date string with:
 * - Year: 2000-2030
 * - Month: 1-12
 * - Day: 1-28 (avoids invalid days for any month)
 */
const validDateStr = fc
  .tuple(
    fc.integer({ min: 2000, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  )
  .map(([year, month, day]) => {
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  });

describe("getNewsDayTitle property tests", () => {
  it("Property 6: News-day page title generation", () => {
    fc.assert(
      fc.property(validDateStr, (dateStr) => {
        const result = getNewsDayTitle(dateStr);

        // Output starts with "Trump News for "
        expect(result.startsWith("Trump News for ")).toBe(true);

        // Output contains a comma (from en-US date formatting)
        expect(result).toContain(",");

        // Extract year from input and verify it appears in the output
        const year = dateStr.split("-")[0];
        expect(result).toContain(year);

        // Output contains a valid weekday name
        const hasWeekday = VALID_WEEKDAYS.some((day) => result.includes(day));
        expect(hasWeekday).toBe(true);

        // Output contains a valid month name
        const hasMonth = VALID_MONTHS.some((month) => result.includes(month));
        expect(hasMonth).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
