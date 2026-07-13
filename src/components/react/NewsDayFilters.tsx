import { useState, useEffect, useMemo } from "react";
import type { Article } from "../../types/news";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  articleCardClasses,
  articlesGridClasses,
} from "@/components/article-card-styles";
import { getTagById } from "@/utils/tags";
import { groupByLetter } from "@/utils/alpha-group";

export interface FilterState {
  tags: Set<string>;
  sources: Set<string>;
  authors: Set<string>;
  order: "desc" | "asc";
}

/**
 * Serialize filter state to URL query parameters.
 * - `t`: comma-separated tags
 * - `s`: comma-separated sources
 * - `a`: comma-separated authors
 * - `o`: "asc" or "desc" (omitted when "desc" — default)
 */
export function serializeFilters(state: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.tags.size > 0) {
    params.set("t", Array.from(state.tags).map(encodeURIComponent).join(","));
  }
  if (state.sources.size > 0) {
    params.set("s", Array.from(state.sources).map(encodeURIComponent).join(","));
  }
  if (state.authors.size > 0) {
    params.set("a", Array.from(state.authors).map(encodeURIComponent).join(","));
  }
  if (state.order === "asc") {
    params.set("o", "asc");
  }
  return params;
}

/**
 * Deserialize URL query parameters into filter state.
 */
export function deserializeFilters(params: URLSearchParams): FilterState {
  const parseSet = (key: string): Set<string> => {
    const v = params.get(key);
    if (!v) return new Set();
    return new Set(v.split(",").map(decodeURIComponent).filter(Boolean));
  };
  const order = params.get("o");
  return {
    tags: parseSet("t"),
    sources: parseSet("s"),
    authors: parseSet("a"),
    order: order === "asc" ? "asc" : "desc",
  };
}

/** Human-readable tag label + optional description tooltip. */
export function getTagLabel(tagId: string): { label: string; description?: string } {
  const info = getTagById(tagId);
  if (info) {
    return { label: info.name, description: info.description };
  }
  // Fallback: prettify unknown tokens (snake_case → Title Case)
  const label = tagId
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return { label: label || tagId };
}

interface NewsDayFiltersProps {
  articles: Article[];
}

const IMAGE_FALLBACK_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='100%25' height='100%25' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='Arial' font-size='32'%3EImage unavailable%3C/text%3E%3C/svg%3E";

const selectClass =
  "h-8 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type ChipItem = {
  value: string;
  label: string;
  description?: string;
};

export default function NewsDayFilters({ articles }: NewsDayFiltersProps) {
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [activeSources, setActiveSources] = useState<Set<string>>(new Set());
  const [activeAuthors, setActiveAuthors] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const state = deserializeFilters(params);
    if (state.tags.size) setActiveTags(state.tags);
    if (state.sources.size) setActiveSources(state.sources);
    if (state.authors.size) setActiveAuthors(state.authors);
    setSortOrder(state.order);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const state: FilterState = {
      tags: activeTags,
      sources: activeSources,
      authors: activeAuthors,
      order: sortOrder,
    };
    const params = serializeFilters(state);
    const qs = params.toString();
    const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    window.history.replaceState({}, "", newUrl);
  }, [activeTags, activeSources, activeAuthors, sortOrder]);

  const tagItems = useMemo((): ChipItem[] => {
    const set = new Set<string>();
    for (const article of articles) {
      for (const tag of article.tags) set.add(tag);
    }
    return Array.from(set)
      .map((value) => {
        const { label, description } = getTagLabel(value);
        return { value, label, description };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [articles]);

  const sourceItems = useMemo((): ChipItem[] => {
    const set = new Set<string>();
    for (const article of articles) {
      if (article.source?.name) set.add(article.source.name);
    }
    return Array.from(set)
      .map((value) => ({ value, label: value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [articles]);

  const authorItems = useMemo((): ChipItem[] => {
    const set = new Set<string>();
    const sources = new Set<string>();
    for (const article of articles) {
      if (article.source?.name) sources.add(article.source.name);
      if (article.author) set.add(article.author);
    }
    return Array.from(set)
      .filter((a) => !sources.has(a))
      .map((value) => ({ value, label: value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [articles]);

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      if (activeTags.size > 0) {
        if (!article.tags.some((t) => activeTags.has(t))) return false;
      }
      if (activeSources.size > 0) {
        if (!article.source?.name || !activeSources.has(article.source.name)) {
          return false;
        }
      }
      if (activeAuthors.size > 0) {
        if (!article.author || !activeAuthors.has(article.author)) {
          return false;
        }
      }
      return true;
    });
  }, [articles, activeTags, activeSources, activeAuthors]);

  const sortedArticles = useMemo(() => {
    const copy = [...filteredArticles];
    copy.sort((a, b) => {
      const at = a.publishedAtTs;
      const bt = b.publishedAtTs;
      return sortOrder === "desc" ? bt - at : at - bt;
    });
    return copy;
  }, [filteredArticles, sortOrder]);

  const toggle = (
    value: string,
    set: React.Dispatch<React.SetStateAction<Set<string>>>,
  ) => {
    set((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const hasFilters =
    activeTags.size > 0 || activeSources.size > 0 || activeAuthors.size > 0;
  const totalCount = articles.length;
  const visibleCount = sortedArticles.length;

  const renderDisclosure = (
    label: string,
    items: ChipItem[],
    active: Set<string>,
    onToggle: (v: string) => void,
    onClear: () => void,
  ) => {
    if (items.length === 0) return null;
    const activeCount = active.size;
    const alphaGroups = groupByLetter(items, (item) => item.label);
    const presentLetters = new Set(
      alphaGroups.map((g) => g.key).filter((k) => k !== "#"),
    );
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const panelId = `filter-${label.toLowerCase()}`;

    return (
      <details
        className="group rounded-lg border border-border open:shadow-sm"
        open={activeCount > 0 ? true : undefined}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {label}
            <span className="font-normal text-muted-foreground">
              ({items.length}
              {activeCount > 0 ? ` · ${activeCount} selected` : ""})
            </span>
          </span>
          {activeCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-primary"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClear();
              }}
            >
              Clear
            </Button>
          )}
        </summary>
        <div className="border-t border-border px-4 py-3">
          {/* Compact A–Z jump within this disclosure */}
          <nav
            className="mb-3 flex flex-wrap items-center gap-0.5"
            aria-label={`${label} jump to letter`}
          >
            {alphabet.map((letter) =>
              presentLetters.has(letter) ? (
                <a
                  key={letter}
                  href={`#${panelId}-${letter}`}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-primary no-underline transition hover:bg-primary/10"
                  onClick={(e) => {
                    // Keep the details open; prevent summary toggle bubbling
                    e.stopPropagation();
                  }}
                >
                  {letter}
                </a>
              ) : (
                <span
                  key={letter}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs text-muted-foreground/35"
                  aria-hidden="true"
                >
                  {letter}
                </span>
              ),
            )}
            {alphaGroups.some((g) => g.key === "#") && (
              <a
                href={`#${panelId}-other`}
                className="inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-bold text-primary no-underline transition hover:bg-primary/10"
                onClick={(e) => e.stopPropagation()}
              >
                #
              </a>
            )}
          </nav>

          {/* Letter groups: circle + chip flow */}
          <div className="flex flex-col gap-3">
            {alphaGroups.map(({ key, items: groupItems }) => {
              const anchorId =
                key === "#" ? `${panelId}-other` : `${panelId}-${key}`;
              return (
                <div
                  key={key}
                  id={anchorId}
                  className="flex flex-wrap items-center gap-2 scroll-mt-4"
                >
                  <span
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                    aria-hidden="true"
                  >
                    {key}
                  </span>
                  {groupItems.map(({ value, label: chipLabel, description }) => (
                    <button
                      type="button"
                      key={value}
                      title={description}
                      onClick={() => onToggle(value)}
                    >
                      <Badge
                        variant={active.has(value) ? "solid" : "outline"}
                        className="cursor-pointer"
                      >
                        {chipLabel}
                      </Badge>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </details>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground">
          {hasFilters
            ? `Showing ${visibleCount} of ${totalCount} articles`
            : `${totalCount} articles`}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort:</span>
          <select
            className={selectClass}
            value={sortOrder}
            onChange={(e) =>
              setSortOrder(e.target.value === "asc" ? "asc" : "desc")
            }
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {renderDisclosure(
          "Tags",
          tagItems,
          activeTags,
          (t) => toggle(t, setActiveTags),
          () => setActiveTags(new Set()),
        )}
        {renderDisclosure(
          "Sources",
          sourceItems,
          activeSources,
          (s) => toggle(s, setActiveSources),
          () => setActiveSources(new Set()),
        )}
        {renderDisclosure(
          "Authors",
          authorItems,
          activeAuthors,
          (a) => toggle(a, setActiveAuthors),
          () => setActiveAuthors(new Set()),
        )}
      </div>

      <div className={articlesGridClasses}>
        {sortedArticles.map((article) => {
          const displayTags = article.tags
            .map((id) => getTagLabel(id))
            .sort((a, b) => a.label.localeCompare(b.label));

          return (
            <a
              key={article.url}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(articleCardClasses, "text-inherit no-underline")}
            >
              {article.urlToImage && (
                <img
                  src={article.urlToImage}
                  alt={article.title}
                  className="h-[200px] w-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.onerror = null;
                    img.src = IMAGE_FALLBACK_SRC;
                    img.style.objectFit = "contain";
                  }}
                />
              )}
              <div className="flex flex-1 flex-col p-4">
                <div className="mb-2 text-base font-bold">{article.title}</div>
                <div className="mb-2 text-xs text-muted-foreground">
                  {[article.author, article.source.name]
                    .filter(Boolean)
                    .filter((v, i, arr) => arr.indexOf(v) === i)
                    .join(" · ")}
                </div>
                {article.description && (
                  <div className="flex-1 text-sm text-muted-foreground">
                    {article.description}
                  </div>
                )}
                {displayTags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {displayTags.map(({ label, description }) => (
                      <span
                        key={label}
                        title={description}
                        className="rounded-md border border-border px-1.5 py-0.5 text-[0.65rem] text-muted-foreground"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 text-xs text-muted-foreground">
                  {new Date(article.publishedAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {sortedArticles.length === 0 && hasFilters && (
        <div className="p-8 text-center text-muted-foreground">
          No articles match the current filters.
        </div>
      )}
    </div>
  );
}
