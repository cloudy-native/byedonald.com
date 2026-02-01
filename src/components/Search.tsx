import {
  Box,
  Button,
  HStack,
  Image,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Tag,
  Text,
  useColorModeValue,
  VStack,
} from "@chakra-ui/react";
import { liteClient as algoliasearch } from "algoliasearch/lite";
import type { Hit as AlgoliaHit } from "instantsearch.js";
import { history } from "instantsearch.js/es/lib/routers";
import { singleIndex } from "instantsearch.js/es/lib/stateMappings";
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

const appId = process.env.GATSBY_ALGOLIA_APP_ID;
const searchKey = process.env.GATSBY_ALGOLIA_API_KEY;
const indexName = process.env.GATSBY_ALGOLIA_INDEX_NAME;

function maskSecret(value: string | undefined): string {
  if (!value) return "<missing>";
  if (value.length <= 8) return "<present>";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function logSearchEnvDiagnostics() {
  if (typeof window === "undefined") return;
  const diag = {
    hasAppId: Boolean(appId),
    hasIndexName: Boolean(indexName),
    hasSearchKey: Boolean(searchKey),
    appId: appId ?? "<missing>",
    indexName: indexName ?? "<missing>",
    searchKey: maskSecret(searchKey),
  };
  console.info("[Search] Algolia env diagnostics", diag);
}

logSearchEnvDiagnostics();

// Types for Algolia records and UI items
type Article = {
  url: string;
  urlToImage?: string;
  title: string;
  sourceName?: string;
  author?: string;
  description?: string;
  // Dates (may be absent on some records)
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

console.log("Search Client", searchClient);

function CustomSearchBox({
  onArrow,
  onEnter,
}: {
  onArrow: (delta: number) => void;
  onEnter: () => void;
}) {
  const { query, refine } = useSearchBox({});
  const [input, setInput] = useState(query);

  // Keep local input in sync when query changes from external sources (e.g., URL routing)
  useEffect(() => {
    setInput(query);
  }, [query]);

  // Debounce refine calls
  useEffect(() => {
    const id = setTimeout(() => {
      if (input !== query) {
        refine(input);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [input, query, refine]);

  return (
    <HStack maxW="600px" mx="auto" spacing={3}>
      <Input
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
        size="lg"
        borderRadius="md"
        bg={useColorModeValue("white", "gray.700")}
        borderColor={useColorModeValue("gray.200", "gray.600")}
        _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 1px blue.500" }}
        flex={1}
      />
      <Box
        as="a"
        href="https://www.algolia.com/"
        target="_blank"
        rel="noopener noreferrer"
        title="Search by Algolia"
      >
        <Image
          src="/algolia.png"
          alt="Algolia"
          h="48px" // roughly matches Chakra Input size="lg" height
          objectFit="contain"
        />
      </Box>
    </HStack>
  );
}

// Shows author facet chips only when the author label differs from all source names.
function DistinctAuthorChips() {
  const authorHook = useRefinementList({
    attribute: "author",
    limit: 10,
    showMore: true,
    showMoreLimit: 30,
  });
  const sourceHook = useRefinementList({
    attribute: "sourceName",
    limit: 1000, // large enough for comparison; not rendered
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
    <VStack align="stretch" spacing={2} w="full">
      <HStack justify="space-between">
        <Text fontWeight="semibold">Authors</Text>
        {canToggleShowMore && (
          <Button size="xs" variant="ghost" onClick={toggleShowMore}>
            {isShowingMore ? "Show less" : "Show more"}
          </Button>
        )}
      </HStack>
      <HStack wrap="wrap" spacing={2}>
        {filteredAuthors.map((item: FacetItem) => (
          <Tag
            key={item.value}
            size="sm"
            variant={item.isRefined ? "solid" : "outline"}
            colorScheme="blue"
            cursor="pointer"
            onClick={() => refine(item.value)}
          >
            {item.label} {item.count != null ? `(${item.count})` : ""}
          </Tag>
        ))}
      </HStack>
    </VStack>
  );
}

function SortBySelect() {
  // These replica names must exist in Algolia for sorting to work
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
    <Select
      size="sm"
      maxW="52"
      onChange={(e) => refine(e.target.value)}
      value={currentRefinement}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </Select>
  );
}

function Hit({ hit, selected }: { hit: ArticleHit; selected: boolean }) {
  const borderColor = useColorModeValue("blue.400", "blue.300");
  const mutedTextColor = useColorModeValue("gray.600", "gray.300");
  return (
    <Box
      as="a"
      href={hit.url}
      target="_blank"
      rel="noopener noreferrer"
      borderRadius="md"
      overflow="hidden"
      borderWidth="1px"
      borderColor={selected ? borderColor : undefined}
      bg={useColorModeValue("white", "gray.700")}
      _hover={{ shadow: "lg", transform: "translateY(-4px)" }}
      transition="all 0.2s"
      display="block"
    >
      {hit.urlToImage && (
        <Image
          src={hit.urlToImage}
          alt={hit.title}
          objectFit="cover"
          loading="lazy"
          w="100%"
          h="150px"
        />
      )}
      <Box p={4}>
        <Text fontWeight="bold" fontSize="md" noOfLines={2}>
          <Highlight attribute="title" hit={hit} />
        </Text>
        {
          // First line: Author / Source (dedup if equal)
        }
        {hit.sourceName || hit.author ? (
          <Text fontSize="sm" color={mutedTextColor} noOfLines={1} mt={1}>
            {(() => {
              const author = hit.author?.trim();
              const source = hit.sourceName?.trim();
              if (author && source) {
                if (author.toLowerCase() === source.toLowerCase()) {
                  return author; // same, display once
                }
                return `${author} • ${source}`;
              }
              return author || source || "";
            })()}
          </Text>
        ) : null}
        {
          // Second line: Published date only
        }
        {hit.publishedAt || typeof hit.publishedAtTs === "number" ? (
          <Text fontSize="sm" color={mutedTextColor} noOfLines={1} mt={1}>
            {(() => {
              const ms =
                typeof hit.publishedAtTs === "number"
                  ? hit.publishedAtTs * 1000
                  : Date.parse(hit.publishedAt ?? "");
              if (!Number.isNaN(ms)) {
                const d = new Date(ms);
                return d.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                });
              }
              return "";
            })()}
          </Text>
        ) : null}
        {hit.description && (
          <Text fontSize="sm" color={mutedTextColor} noOfLines={3} mt={2}>
            <Snippet attribute="description" hit={hit} />
          </Text>
        )}
      </Box>
    </Box>
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
    <VStack align="stretch" spacing={2} w="full">
      <HStack justify="space-between">
        <Text fontWeight="semibold">{label}</Text>
        {canToggleShowMore && (
          <Button size="xs" variant="ghost" onClick={toggleShowMore}>
            {isShowingMore ? "Show less" : "Show more"}
          </Button>
        )}
      </HStack>
      <HStack wrap="wrap" spacing={2}>
        {items.map((item: FacetItem) => (
          <Tag
            key={item.value}
            size="sm"
            variant={item.isRefined ? "solid" : "outline"}
            colorScheme="blue"
            cursor="pointer"
            onClick={() => refine(item.value)}
          >
            {item.label} {item.count != null ? `(${item.count})` : ""}
          </Tag>
        ))}
      </HStack>
    </VStack>
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
    <Select
      size="sm"
      maxW="48"
      onChange={(e) => refine(Number(e.target.value))}
      value={(items.find((i) => i.isRefined) || items[0]).value}
    >
      {items.map((i) => (
        <option key={i.value} value={i.value}>
          {i.label}
        </option>
      ))}
    </Select>
  );
}

function PaginationControls() {
  const { currentRefinement, nbPages, refine, isFirstPage, isLastPage } =
    usePagination({ padding: 0 });

  // Build a windowed pagination model: first, last, and a few around current
  const window = 2; // how many pages on each side of current
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
    <HStack spacing={2}>
      <Button
        size="sm"
        onClick={() => refine(first)}
        isDisabled={isFirstPage}
        variant="ghost"
      >
        First
      </Button>
      <Button
        size="sm"
        onClick={() => refine(currentRefinement - 1)}
        isDisabled={isFirstPage}
      >
        Prev
      </Button>
      {pageItems.map((item) =>
        typeof item === "string" && item.startsWith("ellipsis") ? (
          <Text key={item} px={2} userSelect="none">
            …
          </Text>
        ) : (
          <Button
            key={item}
            size="sm"
            variant={item === currentRefinement ? "solid" : "outline"}
            onClick={() => refine(item as number)}
          >
            {(item as number) + 1}
          </Button>
        ),
      )}
      <Button
        size="sm"
        onClick={() => refine(currentRefinement + 1)}
        isDisabled={isLastPage}
      >
        Next
      </Button>
      <Button
        size="sm"
        onClick={() => refine(last)}
        isDisabled={isLastPage}
        variant="ghost"
      >
        Last
      </Button>
    </HStack>
  );
}

function AlgoliaSearch() {
  const { status, results } = useInstantSearch();
  const { items } = useHits<ArticleHit>();
  useConfigure({ clickAnalytics: true });

  const [selected, setSelected] = useState<number>(-1);
  const emptyTextColor = useColorModeValue("gray.500", "gray.400");

  const handleArrow = (delta: number) => {
    if (!items || items.length === 0) return;
    setSelected((prev) => {
      const next = (prev + delta + items.length) % items.length;
      return next;
    });
  };

  const handleEnter = () => {
    if (selected >= 0 && selected < items.length) {
      const url = items[selected]?.url;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // Derive total hits and paging info from InstantSearch results
  const totalHits = results?.nbHits ?? 0;
  const hitsPerPage = results?.hitsPerPage ?? items.length;
  const page = results?.page ?? 0; // zero-based
  const nbPages = results?.nbPages ?? 1;
  const start = totalHits > 0 ? page * hitsPerPage + 1 : 0;
  const end = totalHits > 0 ? Math.min((page + 1) * hitsPerPage, totalHits) : 0;

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* Search Box and top controls */}
        <VStack spacing={3} align="stretch">
          <CustomSearchBox onArrow={handleArrow} onEnter={handleEnter} />
          <HStack justify="space-between">
            <HStack spacing={3}>
              <ClearRefinementsButton />
              <PaginationControls />
              <HitsPerPageSelect />
              <SortBySelect />
            </HStack>
            {/* simple results info */}
            <Text
              fontSize="sm"
              color={useColorModeValue("gray.600", "gray.300")}
            >
              {totalHits === 0
                ? "0 results"
                : `Showing ${start}–${end} of ${totalHits} results • Page ${page + 1} of ${nbPages}`}
            </Text>
          </HStack>
        </VStack>

        {/* Facets */}
        <VStack spacing={4} align="stretch">
          <FacetChips attribute="sourceName" label="Sources" />
          <DistinctAuthorChips />
        </VStack>

        {/* Loading Indicator */}
        {status === "loading" && <Spinner size="lg" color="blue.500" />}

        {/* Empty/Results */}
        {status !== "loading" && items.length === 0 && (
          <Text color={emptyTextColor}>
            {status === "idle"
              ? "Start typing to search articles..."
              : "No results found. Try different keywords or clearing filters."}
          </Text>
        )}

        {/* Hits */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} w="full">
          {items.map((hit: ArticleHit, i: number) => (
            <Hit key={hit.objectID} hit={hit} selected={i === selected} />
          ))}
        </SimpleGrid>

        {/* Pagination */}
        <PaginationControls />
      </VStack>
    </Box>
  );
}

function Search() {
  if (!searchClient || !indexName) {
    return (
      <Box p={6}>
        <VStack align="stretch" spacing={3}>
          <Text>Search is not implemented yet</Text>
          <Box fontFamily="mono" fontSize="sm">
            <div>{`GATSBY_ALGOLIA_APP_ID: ${appId ?? "<missing>"}`}</div>
            <div>{`GATSBY_ALGOLIA_INDEX_NAME: ${indexName ?? "<missing>"}`}</div>
            <div>{`GATSBY_ALGOLIA_API_KEY: ${maskSecret(searchKey)}`}</div>
          </Box>
          <Button size="sm" onClick={logSearchEnvDiagnostics} alignSelf="start">
            Log diagnostics
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={indexName}
      routing={{ router: history(), stateMapping: singleIndex(indexName) }}
    >
      <AlgoliaSearch />
    </InstantSearch>
  );
}

export default Search;
