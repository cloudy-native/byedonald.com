import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { groupByLetter } from "@/utils/alpha-group";
import { cn } from "@/lib/utils";

export type BrowseItem = {
  /** Display label */
  label: string;
  /** Link href */
  href: string;
  /** Optional count shown as "Label (n)" */
  count?: number;
  /** Optional tooltip / secondary search text */
  description?: string;
};

type Props = {
  items: BrowseItem[];
  /** Prefix for anchor ids, e.g. "tag" → #tag-A */
  idPrefix: string;
  /** Noun for empty / count copy, e.g. "tags" or "sources" */
  itemNoun: string;
  placeholder?: string;
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function matchesQuery(item: BrowseItem, q: string): boolean {
  if (!q) return true;
  const hay = `${item.label} ${item.description ?? ""}`.toLowerCase();
  return hay.includes(q);
}

export default function AlphaBrowseList({
  items,
  idPrefix,
  itemNoun,
  placeholder = "Search…",
}: Props) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return items;
    return items.filter((item) => matchesQuery(item, q));
  }, [items, q]);

  const alphaGroups = useMemo(
    () => groupByLetter(filtered, (item) => item.label),
    [filtered],
  );

  const presentLetters = useMemo(
    () => new Set(alphaGroups.map((g) => g.key).filter((k) => k !== "#")),
    [alphaGroups],
  );
  const hasOther = alphaGroups.some((g) => g.key === "#");

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="h-10 pr-20"
            aria-label={`Search ${itemNoun}`}
            autoComplete="off"
          />
          {query.trim().length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 h-8 -translate-y-1/2 text-xs"
              onClick={() => setQuery("")}
            >
              Clear
            </Button>
          )}
        </div>
        <p className="shrink-0 text-sm text-muted-foreground sm:text-right">
          {q
            ? `${filtered.length} of ${items.length} ${itemNoun}`
            : `${items.length} ${itemNoun}`}
        </p>
      </div>

      {/* Sticky A–Z jump bar (updates with search) */}
      <nav
        className="sticky top-[60px] z-40 mb-8 flex flex-wrap items-center gap-0.5 rounded-xl border border-border bg-background/95 p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80"
        aria-label="Jump to letter"
      >
        {ALPHABET.map((letter) =>
          presentLetters.has(letter) ? (
            <a
              key={letter}
              href={`#${idPrefix}-${letter}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-blue-700 no-underline transition hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-950"
            >
              {letter}
            </a>
          ) : (
            <span
              key={letter}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs text-muted-foreground/35"
              aria-hidden="true"
            >
              {letter}
            </span>
          ),
        )}
        {hasOther && (
          <a
            href={`#${idPrefix}-other`}
            className="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-bold text-blue-700 no-underline transition hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-950"
          >
            #
          </a>
        )}
      </nav>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No {itemNoun} match “{query.trim()}”.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {alphaGroups.map(({ key, items: group }) => {
            const anchorId =
              key === "#" ? `${idPrefix}-other` : `${idPrefix}-${key}`;
            return (
              <div
                key={key}
                id={anchorId}
                className="flex flex-wrap items-center gap-2"
                style={{ scrollMarginTop: "7.5rem" }}
              >
                <span
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold tracking-wide text-white ring-2 ring-blue-600/20 ring-offset-2 ring-offset-background dark:bg-blue-500 dark:text-slate-900 dark:ring-blue-400/30"
                  aria-hidden="true"
                >
                  {key}
                </span>
                <span className="sr-only">
                  {itemNoun} starting with{" "}
                  {key === "#" ? "a number or symbol" : key}
                </span>
                {group.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    title={item.description}
                    className={cn(
                      "inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-blue-700 no-underline transition-colors",
                      "hover:border-blue-300 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-muted",
                    )}
                  >
                    {item.count != null
                      ? `${item.label} (${item.count})`
                      : item.label}
                  </a>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
