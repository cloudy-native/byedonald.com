import { describe, expect, it } from "vitest";
import {
  articleCardClasses,
  articlesGridClasses,
  articleDescriptionClasses,
  articleMetaClasses,
  articleTitleClasses,
} from "../article-card-styles";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("ArticleCard styles (Req 7.5, 7.6)", () => {
  it("applies hover scale, shadow-lg, and duration-200", () => {
    expect(articleCardClasses).toContain("hover:scale-[1.02]");
    expect(articleCardClasses).toContain("hover:shadow-lg");
    expect(articleCardClasses).toContain("duration-200");
  });

  it("uses responsive grid breakpoints: 1 / md:2 / lg:3", () => {
    expect(articlesGridClasses).toContain("grid-cols-1");
    expect(articlesGridClasses).toContain("md:grid-cols-2");
    expect(articlesGridClasses).toContain("lg:grid-cols-3");
  });

  it("ArticleCard.astro renders title, description, source, and date slots", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/ArticleCard.astro"),
      "utf-8",
    );
    expect(src).toContain("{title}");
    expect(src).toContain("{description}");
    expect(src).toContain("{sourceName}");
    expect(src).toContain("datetime={publishedAt}");
    expect(src).toContain("articleCardClasses");
  });

  it("exports meta and title class helpers", () => {
    expect(articleTitleClasses).toBeTruthy();
    expect(articleDescriptionClasses).toContain("text-muted-foreground");
    expect(articleMetaClasses).toContain("text-xs");
  });
});
