import { describe, expect, it } from "vitest";
import type { Article } from "../types/news";
import { filterOffTopic } from "./filters";

function makeArticle(tags: string[]): Article {
  return {
    source: { id: null, name: "Test Source" },
    author: "Test Author",
    title: "Test Title",
    description: "Test Description",
    url: "https://example.com/test",
    urlToImage: null,
    publishedAt: "2023-01-01T00:00:00Z",
    content: null,
    tags,
    publishedAtTs: 1672531200,
  };
}

describe("filterOffTopic", () => {
  it("returns all articles when none are off-topic", () => {
    const articles = [
      makeArticle(["politics", "economy"]),
      makeArticle(["legal"]),
    ];
    expect(filterOffTopic(articles)).toEqual(articles);
  });

  it("excludes articles with off_topic tag", () => {
    const onTopic = makeArticle(["politics"]);
    const offTopic = makeArticle(["off_topic"]);
    expect(filterOffTopic([onTopic, offTopic])).toEqual([onTopic]);
  });

  it("excludes articles where off_topic is among multiple tags", () => {
    const mixed = makeArticle(["politics", "off_topic", "economy"]);
    expect(filterOffTopic([mixed])).toEqual([]);
  });

  it("returns empty array when all articles are off-topic", () => {
    const articles = [makeArticle(["off_topic"]), makeArticle(["off_topic"])];
    expect(filterOffTopic(articles)).toEqual([]);
  });

  it("returns empty array when given empty input", () => {
    expect(filterOffTopic([])).toEqual([]);
  });
});
