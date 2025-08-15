import { Box, Button, Card, CardBody, Heading, HStack, Image, Link, Select, SimpleGrid, Tag, Text, VStack } from "@chakra-ui/react";
import { graphql, Link as GatsbyLink, PageProps } from "gatsby";
import React from "react";
import { Article } from "../types/news";
import { getDisplayableTagsByIds } from "../utils/tags";

export const query = graphql`
  query($sourceName: String!) {
    allArticle(filter: { source: { name: { eq: $sourceName } } }) {
      nodes {
        author
        title
        description
        url
        urlToImage
        publishedAt
        source { name }
        tags
      }
    }
  }
`;

interface SourcePageContext {
  sourceName: string;
}

const SourceTemplate: React.FC<PageProps<any, SourcePageContext>> = ({ data, pageContext }) => {
  const articles = (data?.allArticle?.nodes ?? []) as Article[];
  const { sourceName } = pageContext;
  const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest">("newest");
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(24);

  const sortedArticles = React.useMemo(() => {
    const copy = [...articles];
    copy.sort((a, b) => {
      const at = new Date(a.publishedAt).getTime();
      const bt = new Date(b.publishedAt).getTime();
      return sortOrder === "newest" ? bt - at : at - bt;
    });
    return copy;
  }, [articles, sortOrder]);

  // Hydrate pagination/sort from URL on mount (SSR-safe)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const order = params.get("o");
    const p = params.get("p");
    const ps = params.get("ps");
    if (order === "newest" || order === "oldest") setSortOrder(order as any);
    if (p) {
      const n = parseInt(p, 10);
      if (!Number.isNaN(n) && n > 0) setPage(n);
    }
    if (ps) {
      const n = parseInt(ps, 10);
      if (!Number.isNaN(n) && n > 0) setPageSize(n);
    }
  }, []);

  // Compute pagination values
  const totalPages = React.useMemo(() => Math.max(1, Math.ceil(sortedArticles.length / pageSize)), [sortedArticles.length, pageSize]);

  // Clamp page when dependencies change
  React.useEffect(() => {
    setPage(prev => Math.min(Math.max(1, prev), totalPages));
  }, [totalPages]);

  // Sync URL when sort/page/pageSize change
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (sortOrder !== "newest") params.set("o", sortOrder); else params.delete("o");
    if (page !== 1) params.set("p", String(page)); else params.delete("p");
    if (pageSize !== 24) params.set("ps", String(pageSize)); else params.delete("ps");
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", newUrl);
  }, [sortOrder, page, pageSize]);

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageArticles = sortedArticles.slice(startIndex, endIndex);

  const PaginationControls = () => (
    <HStack justify="center" align="center" spacing={4} wrap="wrap">
      <Button size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} isDisabled={page <= 1}>
        Prev
      </Button>
      <Text fontSize="sm" color="gray.600">Page {page} of {totalPages}</Text>
      <Button size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} isDisabled={page >= totalPages}>
        Next
      </Button>
      <HStack spacing={2} pl={2}>
        <Select size="sm" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }} maxW="24">
          <option value={12}>12</option>
          <option value={24}>24</option>
          <option value={48}>48</option>
        </Select>
        <Text fontSize="xs" color="gray.500">per page</Text>
      </HStack>
    </HStack>
  );

  return (
    <Box p={8}>
      <VStack spacing={8} align="stretch">
        <Heading as="h1" size="xl">Articles from: {sourceName}</Heading>
        <HStack justify="space-between" align="center" wrap="wrap" rowGap={2}>
          <Text fontSize="sm" color="gray.600">{sortedArticles.length} articles</Text>
          <HStack>
            <Text fontSize="sm" color="gray.600">Sort</Text>
            <Select size="sm" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} maxW="44">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </Select>
          </HStack>
        </HStack>
        <PaginationControls />
        <Text><GatsbyLink to="/sources">← All sources</GatsbyLink></Text>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
          {currentPageArticles.map((article, index) => {
            const authorAndSource = [...new Set([article.author, article.source.name].filter(Boolean))].join(", ");
            return (
              <Card key={index} as={Link} href={article.url} isExternal transition="all 0.2s ease-in-out" _hover={{ transform: "scale(1.02)", boxShadow: "lg", textDecoration: "none" }}>
                <CardBody display="flex" flexDirection="column">
                  {article.urlToImage && (
                    <Image src={article.urlToImage} alt={article.title} borderRadius="lg" mb={4} height="200px" objectFit="cover" />
                  )}
                  <VStack align="stretch" spacing={3} flexGrow={1}>
                    <Heading size="md">{article.title}</Heading>
                    {authorAndSource && <Text>{authorAndSource}</Text>}
                    <Text fontSize="sm" color="gray.500" noOfLines={3}>{article.description}</Text>
                  </VStack>
                  {article.tags && article.tags.length > 0 && (
                    <HStack spacing={2} mt={4} wrap="wrap">
                      {getDisplayableTagsByIds(article.tags).map(tag => (
                        // @ts-ignore
                        <Tag key={tag.id} size="sm" variant="solid" bg={tag.color} color="white">{tag.name}</Tag>
                      ))}
                    </HStack>
                  )}
                  <HStack justify="space-between" align="flex-end" mt={article.tags && article.tags.length > 0 ? 2 : 4}>
                    <Text fontSize="xs" color="gray.600" flexShrink={0}>
                      {new Date(article.publishedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                    </Text>
                  </HStack>
                </CardBody>
              </Card>
            );
          })}
        </SimpleGrid>
        <PaginationControls />
      </VStack>
    </Box>
  );
};

export default SourceTemplate;
