import { describe, expect, it } from "vitest";
import { getNewsDayTitle } from "./title";

describe("getNewsDayTitle", () => {
  it("formats 2023-01-01 as Sunday, January 1, 2023", () => {
    expect(getNewsDayTitle("2023-01-01")).toBe(
      "Trump News for Sunday, January 1, 2023",
    );
  });

  it("formats 2024-07-04 as Thursday, July 4, 2024", () => {
    expect(getNewsDayTitle("2024-07-04")).toBe(
      "Trump News for Thursday, July 4, 2024",
    );
  });

  it("formats 2022-12-31 as Saturday, December 31, 2022", () => {
    expect(getNewsDayTitle("2022-12-31")).toBe(
      "Trump News for Saturday, December 31, 2022",
    );
  });

  it("formats 2025-02-28 as Friday, February 28, 2025", () => {
    expect(getNewsDayTitle("2025-02-28")).toBe(
      "Trump News for Friday, February 28, 2025",
    );
  });

  it("starts with 'Trump News for'", () => {
    expect(getNewsDayTitle("2023-06-15")).toMatch(/^Trump News for /);
  });
});
