import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// --- Types ---

type WorstThingItem = {
  id: number;
  text: string;
  tags: string[];
};

type WorstThingsMonth = {
  year: number;
  month: number;
  items: WorstThingItem[];
};

type TagDefinitionTag = {
  id: string;
  name: string;
  description: string;
};

type TagDefinitionCategory = {
  title: string;
  description: string;
  color: string;
  tags: TagDefinitionTag[];
};

type TagMeta = {
  name: string;
  color: string;
  categoryTitle: string;
};

interface WorstThingsProps {
  months: WorstThingsMonth[];
  tagCategories: TagDefinitionCategory[];
}

// --- Helpers ---

const monthLabel = (year: number, month: number) =>
  new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

// --- Sub-components ---

const TagLegendInline: React.FC<{
  tagCategories: TagDefinitionCategory[];
  activeTags: Set<string>;
  relevantTagIds: Set<string>;
  onTagClick: (tagId: string) => void;
  onClear: () => void;
}> = ({ tagCategories, activeTags, relevantTagIds, onTagClick, onClear }) => {
  const isFiltering = activeTags.size > 0;

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-3">
        {tagCategories.map((category) => {
          const categoryTags = category.tags.filter((tag) =>
            relevantTagIds.has(tag.id),
          );
          if (categoryTags.length === 0) return null;

          const categoryIsActive =
            !isFiltering || categoryTags.some((tag) => activeTags.has(tag.id));

          return (
            <div
              key={category.title}
              className="rounded-md p-2"
              style={{
                border: `2px solid ${categoryIsActive ? category.color : "var(--border)"}`,
              }}
            >
              <h4
                className="mb-1 text-xs font-semibold"
                style={{ color: category.color }}
              >
                {category.title}
              </h4>
              <div className="flex flex-wrap gap-1">
                {categoryTags.map((tag) => {
                  const tagIsActive = !isFiltering || activeTags.has(tag.id);
                  return (
                    <button
                      type="button"
                      key={tag.id}
                      title={tag.description}
                      onClick={() => onTagClick(tag.id)}
                      className={cn(
                        "cursor-pointer rounded px-1.5 py-0.5 text-[0.7rem] leading-snug text-white",
                        !tagIsActive && "opacity-40",
                      )}
                      style={{ backgroundColor: category.color }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {isFiltering && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={onClear}
        >
          Clear tag filters
        </Button>
      )}
    </div>
  );
};

const WorstThingEntry: React.FC<{
  item: WorstThingItem;
  tagMetaById: ReadonlyMap<string, TagMeta>;
  scrollMarginTop?: string;
}> = ({ item, tagMetaById, scrollMarginTop }) => {
  return (
    <div
      id={`wt-${item.id}`}
      className="flex h-full flex-col rounded-lg border border-border bg-card p-4"
      style={{ scrollMarginTop: scrollMarginTop ?? "96px" }}
    >
      <div className="flex flex-1 items-start gap-3">
        <span className="min-w-14 shrink-0 text-base font-bold text-blue-800 dark:text-blue-300">
          {item.id}.
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {item.text}
          </p>
          {Array.isArray(item.tags) && item.tags.length > 0 && (
            <div className="mt-auto flex flex-wrap gap-1 pt-2">
              {item.tags
                .slice()
                .sort()
                .map((id) => {
                  const meta = tagMetaById.get(id);
                  return (
                    <span
                      key={id}
                      className="rounded px-1.5 py-0.5 text-[0.7rem]"
                      style={{
                        backgroundColor: meta?.color ?? undefined,
                        color: meta ? "white" : undefined,
                      }}
                    >
                      <span
                        className={cn(
                          !meta &&
                            "rounded bg-blue-50 px-1.5 py-0.5 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
                        )}
                      >
                        {meta?.name ?? id}
                      </span>
                    </span>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---

export default function WorstThings({ months, tagCategories }: WorstThingsProps) {
  const tagMetaById = React.useMemo(() => {
    const out = new Map<string, TagMeta>();
    for (const category of tagCategories) {
      for (const t of category.tags) {
        out.set(t.id, {
          name: t.name,
          color: category.color,
          categoryTitle: category.title,
        });
      }
    }
    return out;
  }, [tagCategories]);

  const monthsChronological = React.useMemo(() => {
    const copy = [...(months ?? [])];
    copy.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
    return copy;
  }, [months]);

  const relevantTagIds = React.useMemo(() => {
    const out = new Set<string>();
    for (const month of monthsChronological) {
      for (const item of month.items) {
        for (const t of item.tags ?? []) out.add(t);
      }
    }
    return out;
  }, [monthsChronological]);

  const [activeTags, setActiveTags] = React.useState<Set<string>>(new Set());
  const [query, setQuery] = React.useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = React.useState<string>("");

  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(id);
  }, [query]);

  const searchableTextById = React.useMemo(() => {
    const out = new Map<number, string>();
    for (const month of monthsChronological) {
      for (const item of month.items) {
        const tagIds = Array.isArray(item.tags) ? item.tags : [];
        const tagNames = tagIds
          .map((t) => tagMetaById.get(t)?.name)
          .filter((n): n is string => typeof n === "string");
        const combined = [item.text, ...tagIds, ...tagNames]
          .join("\n")
          .toLowerCase();
        out.set(item.id, combined);
      }
    }
    return out;
  }, [monthsChronological, tagMetaById]);

  const totalItems = React.useMemo(() => {
    let count = 0;
    for (const m of monthsChronological) count += m.items.length;
    return count;
  }, [monthsChronological]);

  const filteredMonths = React.useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const hasQuery = q.length > 0;
    const hasTags = activeTags.size > 0;
    if (!hasQuery && !hasTags) return monthsChronological;

    return monthsChronological
      .map((m) => {
        const filteredItems = m.items.filter((item) => {
          const matchesTags =
            !hasTags || (item.tags ?? []).some((t) => activeTags.has(t));
          if (!matchesTags) return false;
          if (!hasQuery) return true;
          const haystack = searchableTextById.get(item.id) ?? "";
          return haystack.includes(q);
        });
        return { ...m, items: filteredItems };
      })
      .filter((m) => m.items.length > 0);
  }, [monthsChronological, activeTags, debouncedQuery, searchableTextById]);

  const filteredItemCount = React.useMemo(() => {
    let count = 0;
    for (const m of filteredMonths) count += m.items.length;
    return count;
  }, [filteredMonths]);

  const [activeMonth, setActiveMonth] = React.useState<string>(() => {
    if (filteredMonths.length > 0) {
      return `${filteredMonths[0].year}-${String(filteredMonths[0].month).padStart(2, "0")}`;
    }
    return "";
  });

  const stickyOffsetPx = 76;
  const stickyOffset = `${stickyOffsetPx}px`;

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (filteredMonths.length === 0) return;

    const ids = filteredMonths.map(
      (m) => `month-${m.year}-${String(m.month).padStart(2, "0")}`,
    );
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0));
        if (visible.length === 0) return;
        const id = visible[0].target.id;
        setActiveMonth(id.replace(/^month-/, ""));
      },
      {
        root: null,
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
        rootMargin: `-${stickyOffsetPx}px 0px -70% 0px`,
      },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [filteredMonths]);

  React.useEffect(() => {
    if (filteredMonths.length === 0) return;
    const firstKey = `${filteredMonths[0].year}-${String(filteredMonths[0].month).padStart(2, "0")}`;
    const stillExists = filteredMonths.some(
      (m) => `${m.year}-${String(m.month).padStart(2, "0")}` === activeMonth,
    );
    if (!stillExists) setActiveMonth(firstKey);
  }, [filteredMonths, activeMonth]);

  return (
    <div className="py-8">
      <div className="mx-auto flex max-w-6xl items-start gap-8 px-4">
        <aside
          className="sticky hidden w-[260px] shrink-0 overflow-y-auto rounded-lg border border-blue-500/20 bg-blue-50/90 p-4 backdrop-blur-md dark:bg-blue-950/40 lg:block"
          style={{
            top: stickyOffset,
            maxHeight: `calc(100vh - ${stickyOffsetPx + 16}px)`,
          }}
        >
          <div className="mb-4 flex flex-col gap-1">
            {filteredMonths.map((m) => {
              const key = `${m.year}-${String(m.month).padStart(2, "0")}`;
              const isActive = key === activeMonth;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => {
                    document
                      .getElementById(`month-${key}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={cn(
                    "cursor-pointer rounded px-2 py-1.5 text-left text-sm",
                    isActive
                      ? "bg-blue-600 font-semibold text-white"
                      : "bg-transparent text-foreground hover:bg-accent",
                  )}
                >
                  {monthLabel(m.year, m.month)}
                </button>
              );
            })}
          </div>

          <TagLegendInline
            tagCategories={tagCategories}
            activeTags={activeTags}
            relevantTagIds={relevantTagIds}
            onTagClick={(tagId) => {
              setActiveTags((prev) => {
                const next = new Set(prev);
                if (next.has(tagId)) next.delete(tagId);
                else next.add(tagId);
                return next;
              });
            }}
            onClear={() => setActiveTags(new Set())}
          />
        </aside>

        <div className="min-w-0 flex-1">
          <h1 className="mb-1 text-3xl font-bold text-blue-800 dark:text-blue-300">
            500 Worst Things
          </h1>
          <p className="mb-4 text-sm text-muted-foreground">
            A comprehensive list documenting 500 of the worst things Trump and
            his admin did just in 2025.
          </p>

          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search within 500 Worst Things…"
                className="flex-1"
              />
              {query.trim().length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery("")}
                >
                  Clear
                </Button>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Showing {filteredItemCount} of {totalItems}
            </p>
          </div>

          <div className="mb-6 space-y-1 text-sm text-muted-foreground">
            <p>
              Thank you as always to Ron Filipkowski and Meidas Plus for amazing
              work putting this together:{" "}
              <a
                href="https://www.meidasplus.com/p/500-worst-things-trump-did-in-2025"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                https://www.meidasplus.com/p/500-worst-things-trump-did-in-2025
              </a>
              .
            </p>
            <p>
              Any errors in converting their original material are mine, and
              mine alone.
            </p>
          </div>

          {/* Mobile tag filters */}
          <div className="mb-6 lg:hidden">
            <TagLegendInline
              tagCategories={tagCategories}
              activeTags={activeTags}
              relevantTagIds={relevantTagIds}
              onTagClick={(tagId) => {
                setActiveTags((prev) => {
                  const next = new Set(prev);
                  if (next.has(tagId)) next.delete(tagId);
                  else next.add(tagId);
                  return next;
                });
              }}
              onClear={() => setActiveTags(new Set())}
            />
          </div>

          <div className="flex flex-col gap-10">
            {filteredMonths.map((m) => {
              const monthKey = `${m.year}-${String(m.month).padStart(2, "0")}`;
              return (
                <div
                  key={monthKey}
                  id={`month-${monthKey}`}
                  style={{ scrollMarginTop: stickyOffset }}
                >
                  <h2 className="mb-4 text-xl font-bold text-blue-800 dark:text-blue-300">
                    {monthLabel(m.year, m.month)}
                  </h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {m.items
                      .slice()
                      .sort((a, b) => a.id - b.id)
                      .map((item) => (
                        <WorstThingEntry
                          key={item.id}
                          item={item}
                          tagMetaById={tagMetaById}
                          scrollMarginTop={stickyOffset}
                        />
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
