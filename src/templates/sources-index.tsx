import {
  Box,
  Heading,
  HStack,
  Input,
  Tag,
  Text,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { Link as GatsbyLink, type PageProps } from "gatsby";
import React from "react";
import { slugify } from "../utils/slugify";

interface SourcesIndexContext {
  sources: string[];
}

// using shared slugify util

const SourcesIndexPage: React.FC<PageProps<unknown, SourcesIndexContext>> = ({
  pageContext,
}) => {
  const { sources = [] } = pageContext;
  const sorted = React.useMemo(
    () => [...sources].sort((a, b) => a.localeCompare(b)),
    [sources],
  );

  // Search state hydrated from URL
  const [query, setQuery] = React.useState<string>("");
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    setQuery(q);
  }, []);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (query) params.set("q", query);
    else params.delete("q");
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", newUrl);
  }, [query]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((s) => s.toLowerCase().includes(q));
  }, [sorted, query]);

  // Group by initial with '#' for non-letters
  const groups = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const s of filtered) {
      const first = s.charAt(0).toUpperCase();
      const key = /[A-Z]/.test(first) ? first : "#";
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    const order = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
    return order
      .filter((k) => map[k] && map[k].length)
      .map((k) => ({
        key: k,
        items: map[k]!.sort((a, b) => a.localeCompare(b)),
      }));
  }, [filtered]);

  return (
    <Box p={8}>
      <VStack align="stretch" spacing={6}>
        <Heading as="h1" size="xl">
          All Sources
        </Heading>
        <Text fontSize="sm" color="gray.600">
          {filtered.length} sources
        </Text>
        <Input
          placeholder="Search sources..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
        />
        <Wrap spacing={3}>
          {groups.map(({ key, items }) => (
            <React.Fragment key={key}>
              <WrapItem>
                <Box
                  flexShrink={0}
                  bg="gray.200"
                  color="purple.700"
                  rounded="full"
                  w="6"
                  h="6"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontWeight="bold"
                  fontSize="sm"
                >
                  {key}
                </Box>
              </WrapItem>
              {items.map((source) => (
                <WrapItem key={source}>
                  <Tag
                    as={GatsbyLink}
                    to={`/sources/${slugify(source)}/`}
                    size="md"
                    variant="outline"
                    colorScheme="purple"
                    _hover={{ textDecoration: "none", bg: "purple.50" }}
                  >
                    {source}
                  </Tag>
                </WrapItem>
              ))}
            </React.Fragment>
          ))}
        </Wrap>
      </VStack>
    </Box>
  );
};

export default SourcesIndexPage;
