import { liteClient as algoliasearch } from "algoliasearch/lite";
import type { Hit as AlgoliaHit } from "instantsearch.js";
import { history } from "instantsearch.js/es/lib/routers/index.js";
import { singleIndex } from "instantsearch.js/es/lib/stateMappings/index.js";
import { useEffect, useState } from "react";
import {
  Highlight,
  InstantSearch,
  Snippet,
  useClearRefinements,
  useConfigure,
  useHits,
  useHitsPerPage,
  useInstantSearch,
  usePagination,
  useRefinementList,
  useSearchBox,
  useSortBy,
} from "react-instantsearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const appId = import.meta.env.PUBLIC_ALGOLIA_APP_ID;
const searchKey = import.meta.env.PUBLIC_ALGOLIA_API_KEY;
const indexName = import.meta.env.PUBLIC_ALGOLIA_INDEX_NAME;

const IMAGE_FALLBACK_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='100%25' height='100%25' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='Arial' font-size='32'%3EImage unavailable%3C/text%3E%3C/svg%3E";

function maskSecret(value: string | undefined): string {
  if (!value) return "<missing>";
  if (value.length <= 8) return "<present>";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function logSearchEnvDiagnostics() {
  if (typeof window === "undefined") return;
  console.info("[Search] Algolia env diagnostics", {
    hasAppId: Boolean(appId),
    hasIndexName: Boolean(indexName),
    hasSearchKey: Boolean(searchKey),
    appId: appId ?? "<missing>",
    indexName: indexName ?? "<missing>",
    searchKey: maskSecret(searchKey),
  });
}

type Article = {
  url: string;
  urlToImage?: string;
  title: string;
  sourceName?: string;
  author?: string;
  description?: string;
  publishedAt?: string;
  publishedAtTs?: number;
  objectID: string;
};
type ArticleHit = AlgoliaHit & Article;
type FacetItem = {
  value: string;
  isRefined: boolean;
  label: string;
  count?: number | null;
};

const searchClient =
  appId && searchKey ? algoliasearch(appId, searchKey) : null;

const selectClass =
  "h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function CustomSearchBox({
  onArrow,
  onEnter,
}: {
  onArrow: (delta: number) => void;
  onEnter: () => void;
}) {
  const { query, refine } = useSearchBox({});
  const [input, setInput] = useState(query);

  useEffect(() => {
    setInput(query);
  }, [query]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (input !== query) refine(input);
    }, 300);
    return () => clearTimeout(id);
  }, [input, query, refine]);

  return (
    <div className="mx-auto flex max-w-xl items-center gap-3">
      <Input
        className="h-11 flex-1 text-base"
        placeholder="Search Trump news..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            onArrow(1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            onArrow(-1);
          } else if (e.key === "Enter") {
            onEnter();
          }
        }}
      />
      <a
        href="https://www.algolia.com/"
        target="_blank"
        rel="noopener noreferrer"
        title="Search by Algolia"
      >
        <img src="/algolia.png" alt="Algolia" className="h-12 object-contain" />
      </a>
    </div>
  );
}

function FacetChips({
  attribute,
  label,
}: {
  attribute: string;
  label: string;
}) {
  const { items, refine, canToggleShowMore, isShowingMore, toggleShowMore } =
    useRefinementList({
      attribute,
      limit: 10,
      showMore: true,
      showMoreLimit: 30,
    });
  if (!items || items.length === 0) return null;
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{label}</span>
        {canToggleShowMore && (
          <Button size="sm" variant="ghost" onClick={toggleShowMore}>
            {isShowingMore ? "Show less" : "Show more"}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item: FacetItem) => (
          <button
            key={item.value}
            type="button"
            onClick={() => refine(item.value)}
          >
            <Badge
              variant={item.isRefined ? "solid" : "outline"}
              className="cursor-pointer"
            >
              {item.label} {item.count != null ? `(${item.count})` : ""}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}

function DistinctAuthorChips() {
  const authorHook = useRefinementList({
    attribute: "author",
    limit: 10,
    showMore: true,
    showMoreLimit: 30,
  });
  const sourceHook = useRefinementList({
    attribute: "sourceName",
    limit: 1000,
    showMore: true,
    showMoreLimit: 2000,
  });

  const {
    items: authorItems,
    refine,
    canToggleShowMore,
    isShowingMore,
    toggleShowMore,
  } = authorHook;
  const { items: sourceItems } = sourceHook;

  const sourceSet = new Set(
    (sourceItems || []).map((s: FacetItem) => s.label.trim().toLowerCase()),
  );
  const filteredAuthors = (authorItems || []).filter((a: FacetItem) => {
    const name = a.label.trim().toLowerCase();
    return !sourceSet.has(name);
  });

  if (!filteredAuthors || filteredAuthors.length === 0) return null;

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Authors</span>
        {canToggleShowMore && (
          <Button size="sm" variant="ghost" onClick={toggleShowMore}>
            {isShowingMore ? "Show less" : "Show more"}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {filteredAuthors.map((item: FacetItem) => (
          <button
            key={item.value}
            type="button"
            onClick={() => refine(item.value)}
          >
            <Badge
              variant={item.isRefined ? "solid" : "outline"}
              className="cursor-pointer"
            >
              {item.label} {item.count != null ? `(${item.count})` : ""}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}

function SortBySelect() {
  const items = indexName
    ? [
        { label: "Relevance", value: indexName },
        { label: "Newest first", value: `${indexName}_date_desc` },
        { label: "Oldest first", value: `${indexName}_date_asc` },
      ]
    : [];

  const { options, refine, currentRefinement } = useSortBy({ items });
  if (!indexName) return null;

  return (
    <select
      className={cn(selectClass, "max-w-52")}
      onChange={(e) => refine(e.target.value)}
      value={currentRefinement}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function Hit({ hit, selected }: { hit: ArticleHit; selected: boolean }) {
  const author = hit.author?.trim();
  const source = hit.sourceName?.trim();
  let byline = "";
  if (author && source) {
    byline =
      author.toLowerCase() === source.toLowerCase()
        ? author
        : `${author} • ${source}`;
  } else {
    byline = author || source || "";
  }

  let dateLabel = "";
  const ms =
    typeof hit.publishedAtTs === "number"
      ? hit.publishedAtTs * 1000
      : Date.parse(hit.publishedAt ?? "");
  if (!Number.isNaN(ms)) {
    dateLabel = new Date(ms).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }

  return (
    <a
      href={hit.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block overflow-hidden rounded-lg border bg-card text-card-foreground transition duration-200 hover:-translate-y-1 hover:shadow-lg",
        selected && "border-primary/60",
      )}
    >
      {hit.urlToImage && (
        <img
          src={hit.urlToImage}
          alt={hit.title}
          referrerPolicy="no-referrer"
          onError={(e) => {
            const img = e.currentTarget;
            img.onerror = null;
            img.src = IMAGE_FALLBACK_SRC;
            img.style.objectFit = "contain";
          }}
          className="h-[150px] w-full object-cover"
          loading="lazy"
        />
      )}
      <div className="p-4">
        <div className="line-clamp-2 text-base font-bold">
          <Highlight attribute="title" hit={hit} />
        </div>
        {byline && (
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
            {byline}
          </p>
        )}
        {dateLabel && (
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
            {dateLabel}
          </p>
        )}
        {hit.description && (
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
            <Snippet attribute="description" hit={hit} />
          </p>
        )}
      </div>
    </a>
  );
}

function ClearRefinementsButton() {
  const { canRefine, refine } = useClearRefinements();
  if (!canRefine) return null;
  return (
    <Button size="sm" variant="ghost" onClick={() => refine()}>
      Clear filters
    </Button>
  );
}

function HitsPerPageSelect() {
  const { items, refine } = useHitsPerPage({
    items: [
      { label: "12 per page", value: 12, default: true },
      { label: "24 per page", value: 24 },
      { label: "48 per page", value: 48 },
    ],
  });
  return (
    <select
      className={cn(selectClass, "max-w-48")}
      onChange={(e) => refine(Number(e.target.value))}
      value={(items.find((i) => i.isRefined) || items[0]).value}
    >
      {items.map((i) => (
        <option key={i.value} value={i.value}>
          {i.label}
        </option>
      ))}
    </select>
  );
}

function PaginationControls() {
  const { currentRefinement, nbPages, refine, isFirstPage, isLastPage } =
    usePagination({ padding: 0 });

  const window = 2;
  const first = 0;
  const last = nbPages - 1;
  const start = Math.max(first + 1, currentRefinement - window);
  const end = Math.min(last - 1, currentRefinement + window);

  const pageItems: Array<number | "ellipsis-left" | "ellipsis-right"> = [];
  pageItems.push(first);
  if (start > first + 1) pageItems.push("ellipsis-left");
  for (let p = start; p <= end; p++) {
    if (p >= first && p <= last) pageItems.push(p);
  }
  if (end < last - 1) pageItems.push("ellipsis-right");
  if (last > first) pageItems.push(last);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => refine(first)}
        disabled={isFirstPage}
      >
        First
      </Button>
      <Button
        size="sm"
        onClick={() => refine(currentRefinement - 1)}
        disabled={isFirstPage}
      >
        Prev
      </Button>
      {pageItems.map((item) =>
        typeof item === "string" && item.startsWith("ellipsis") ? (
          <span key={item} className="select-none px-2">
            …
          </span>
        ) : (
          <Button
            key={item}
            size="sm"
            variant={item === currentRefinement ? "default" : "outline"}
            onClick={() => refine(item as number)}
          >
            {(item as number) + 1}
          </Button>
        ),
      )}
      <Button
        size="sm"
        onClick={() => refine(currentRefinement + 1)}
        disabled={isLastPage}
      >
        Next
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => refine(last)}
        disabled={isLastPage}
      >
        Last
      </Button>
    </div>
  );
}

function AlgoliaSearch() {
  const { status, results } = useInstantSearch();
  const { items } = useHits<ArticleHit>();
  useConfigure({
    clickAnalytics: true,
    attributesToSnippet: ["description:15"],
  });

  const [selected, setSelected] = useState<number>(-1);

  const handleArrow = (delta: number) => {
    if (!items || items.length === 0) return;
    setSelected((prev) => (prev + delta + items.length) % items.length);
  };

  const handleEnter = () => {
    if (selected >= 0 && selected < items.length) {
      const url = items[selected]?.url;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const totalHits = results?.nbHits ?? 0;
  const hitsPerPage = results?.hitsPerPage ?? items.length;
  const page = results?.page ?? 0;
  const nbPages = results?.nbPages ?? 1;
  const start = totalHits > 0 ? page * hitsPerPage + 1 : 0;
  const end = totalHits > 0 ? Math.min((page + 1) * hitsPerPage, totalHits) : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3">
        <CustomSearchBox onArrow={handleArrow} onEnter={handleEnter} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <ClearRefinementsButton />
            <PaginationControls />
            <HitsPerPageSelect />
            <SortBySelect />
          </div>
          <p className="text-sm text-muted-foreground">
            {totalHits === 0
              ? "0 results"
              : `Showing ${start}–${end} of ${totalHits} results • Page ${page + 1} of ${nbPages}`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <FacetChips attribute="sourceName" label="Sources" />
        <DistinctAuthorChips />
      </div>

      {status === "loading" && (
        <div
          className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          role="status"
          aria-label="Loading"
        />
      )}

      {status !== "loading" && items.length === 0 && (
        <p className="text-muted-foreground">
          {status === "idle"
            ? "Start typing to search articles..."
            : "No results found. Try different keywords or clearing filters."}
        </p>
      )}

      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((hit: ArticleHit, i: number) => (
          <Hit key={hit.objectID} hit={hit} selected={i === selected} />
        ))}
      </div>

      <PaginationControls />
    </div>
  );
}

export default function Search() {
  if (!searchClient || !indexName) {
    return (
      <div className="flex flex-col gap-3 p-6">
        <p>Search unavailable</p>
        <div className="font-mono text-sm">
          <div>{`PUBLIC_ALGOLIA_APP_ID: ${appId ?? "<missing>"}`}</div>
          <div>{`PUBLIC_ALGOLIA_INDEX_NAME: ${indexName ?? "<missing>"}`}</div>
          <div>{`PUBLIC_ALGOLIA_API_KEY: ${maskSecret(searchKey)}`}</div>
        </div>
        <Button
          size="sm"
          onClick={logSearchEnvDiagnostics}
          className="self-start"
        >
          Log diagnostics
        </Button>
      </div>
    );
  }

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={indexName}
      routing={{
        router: history(),
        stateMapping: singleIndex(indexName) as never,
      }}
    >
      <AlgoliaSearch />
    </InstantSearch>
  );
}
