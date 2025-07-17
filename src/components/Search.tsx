import {
  Box,
  Image,
  Input,
  SimpleGrid,
  Spinner,
  Text,
  useColorModeValue,
  VStack,
} from "@chakra-ui/react";
import { liteClient as algoliasearch } from "algoliasearch/lite";
import React from "react";
import {
  InstantSearch,
  useHits,
  useInstantSearch,
  useSearchBox,
} from "react-instantsearch";

const appId = process.env.GATSBY_ALGOLIA_APP_ID;
const searchKey = process.env.GATSBY_ALGOLIA_API_KEY;
const indexName = process.env.GATSBY_ALGOLIA_INDEX_NAME;

console.log("Algolia", appId, searchKey, indexName);

const searchClient =
  appId && searchKey ? algoliasearch(appId, searchKey) : null;

console.log("Search Client", searchClient);

function CustomSearchBox(props) {
  const { query, refine } = useSearchBox(props);

  return (
    <Input
      placeholder="Search Trump news..."
      value={query}
      onChange={(e) => refine(e.target.value)}
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

function Hit({ hit }: { hit: any }) {
  return (
    <Box
      as="a"
      href={hit.url}
      target="_blank"
      rel="noopener noreferrer"
      borderRadius="md"
      overflow="hidden"
      borderWidth="1px"
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
          w="100%"
          h="150px"
        />
      )}
      <Box p={4}>
        <Text fontWeight="bold" fontSize="md" noOfLines={2}>
          {hit.title}
        </Text>
      </Box>
    </Box>
  );
}

function AlgoliaSearch() {
  const { status } = useInstantSearch();
  const { items  } = useHits();

  console.log("Items", items);

  return (
    <Box p={6}>
      <VStack spacing={6}>
        {/* Search Box */}
        <CustomSearchBox />

        {/* Loading Indicator */}
        {status === "loading" && <Spinner size="lg" color="blue.500" />}

        {/* Search Results */}
        {status !== "loading" && items.length === 0 && (
          <Text color={useColorModeValue("gray.500", "gray.400")}>
            No results found.
          </Text>
        )}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} w="full">
          {items.map((hit) => (
            <Hit key={hit.objectID} hit={hit} />
          ))}
        </SimpleGrid>
      </VStack>
    </Box>
  );
}

function Search() {
  if (!searchClient || !indexName) {
    return <div>Search is not implemented yet</div>;
  }

  return (
    <InstantSearch searchClient={searchClient} indexName={indexName}>
      <AlgoliaSearch />
    </InstantSearch>
  );
}

export default Search;
