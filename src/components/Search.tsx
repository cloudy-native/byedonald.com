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
} from "react-instantsearch";

const appId = process.env.GATSBY_ALGOLIA_APP_ID;
const searchKey = process.env.GATSBY_ALGOLIA_API_KEY;
const indexName = process.env.GATSBY_ALGOLIA_INDEX_NAME;

console.log("Algolia", appId, searchKey, indexName);

// Types for Algolia records and UI items
type Article = {
  url: string;
  urlToImage?: string;
  title: string;
  sourceName?: string;
  author?: string;
  description?: string;
  objectID: string;
};
type ArticleHit = AlgoliaHit<Article>;
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
      maxW="600px"
      mx="auto"
    />
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
        {hit.sourceName || hit.author ? (
          <Text fontSize="sm" color={mutedTextColor} noOfLines={1} mt={1}>
            {[hit.author, hit.sourceName].filter(Boolean).join(", ")}
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
  const { pages, currentRefinement, nbPages, refine, isFirstPage, isLastPage } =
    usePagination({ padding: 1 });
  if (nbPages <= 1) return null;
  return (
    <HStack spacing={2}>
      <Button
        size="sm"
        onClick={() => refine(currentRefinement - 1)}
        isDisabled={isFirstPage}
      >
        Prev
      </Button>
      {pages.map((p) => (
        <Button
          key={p}
          size="sm"
          variant={p === currentRefinement ? "solid" : "outline"}
          onClick={() => refine(p)}
        >
          {p + 1}
        </Button>
      ))}
      <Button
        size="sm"
        onClick={() => refine(currentRefinement + 1)}
        isDisabled={isLastPage}
      >
        Next
      </Button>
    </HStack>
  );
}

function AlgoliaSearch() {
  const { status } = useInstantSearch();
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

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* Search Box and top controls */}
        <VStack spacing={3} align="stretch">
          <CustomSearchBox onArrow={handleArrow} onEnter={handleEnter} />
          <HStack justify="space-between">
            <HStack spacing={3}>
              <ClearRefinementsButton />
              <HitsPerPageSelect />
            </HStack>
            {/* simple results info */}
            <Text
              fontSize="sm"
              color={useColorModeValue("gray.600", "gray.300")}
            >
              {items.length} results
            </Text>
          </HStack>
        </VStack>

        {/* Facets */}
        <VStack spacing={4} align="stretch">
          <FacetChips attribute="sourceName" label="Sources" />
          <FacetChips attribute="author" label="Authors" />
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
    return <div>Search is not implemented yet</div>;
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
