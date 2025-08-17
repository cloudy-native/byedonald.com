import {
  Box,
  Card,
  CardBody,
  Heading,
  HStack,
  Image,
  Link,
  Select,
  SimpleGrid,
  Tag,
  Text,
  Tooltip,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { Link as GatsbyLink, graphql, type PageProps } from "gatsby";
import React from "react";
import PaginationControls from "../components/PaginationControls";
import type { Article } from "../types/news";
import { getDisplayableTagsByIds, getTagById } from "../utils/tags";

export const query = graphql`
  query($tagId: String!) {
    allArticle(filter: { tags: { in: [$tagId] } }) {
      nodes {
        id
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

interface TagPageContext {
  tagId: string;
}

interface TagPageData {
  allArticle: {
    nodes: Array<Article & { id: string }>;
  };
}

const TagTemplate: React.FC<PageProps<TagPageData, TagPageContext>> = ({
  data,
  pageContext,
}) => {
  const articles = data?.allArticle?.nodes ?? [];
  const { tagId } = pageContext;
  const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest">(
    "newest",
  );
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(24);
  const tagInfo = React.useMemo(() => getTagById(tagId), [tagId]);
  const tagDisplayName = tagInfo?.name ?? tagId;

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
    if (order === "newest" || order === "oldest") setSortOrder(order);
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
  const totalPages = React.useMemo(
    () => Math.max(1, Math.ceil(sortedArticles.length / pageSize)),
    [sortedArticles.length, pageSize],
  );

  // Clamp page when dependencies change
  React.useEffect(() => {
    setPage((prev) => Math.min(Math.max(1, prev), totalPages));
  }, [totalPages]);

  // Sync URL when sort/page/pageSize change
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (sortOrder !== "newest") params.set("o", sortOrder);
    else params.delete("o");
    if (page !== 1) params.set("p", String(page));
    else params.delete("p");
    if (pageSize !== 24) params.set("ps", String(pageSize));
    else params.delete("ps");
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", newUrl);
  }, [sortOrder, page, pageSize]);

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageArticles = sortedArticles.slice(startIndex, endIndex);

  return (
    <Box p={8}>
      <VStack spacing={8} align="stretch">
        <Box
          p={4}
          borderWidth={2}
          borderColor={tagInfo?.category.color || "gray.200"}
          borderRadius="md"
        >
          <Heading
            as="h4"
            size="sm"
            color={tagInfo?.category.color || "gray.600"}
            mb={2}
          >
            {tagInfo?.category.name || "Tag"}
          </Heading>
          <Wrap spacing={2}>
            <WrapItem>
              <Tooltip label={tagInfo?.description} placement="top" hasArrow>
                <Tag
                  size="md"
                  variant="solid"
                  bg={tagInfo?.category.color || "gray.600"}
                  color="white"
                >
                  {tagDisplayName}
                </Tag>
              </Tooltip>
            </WrapItem>
          </Wrap>
        </Box>
        <HStack justify="space-between" align="center" wrap="wrap" rowGap={2}>
          <Text fontSize="sm" color="gray.600">
            {sortedArticles.length} articles
          </Text>
          <HStack>
            <Text fontSize="sm" color="gray.600">
              Sort
            </Text>
            <Select
              size="sm"
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(
                  (e.target.value as "newest" | "oldest") ?? "newest",
                )
              }
              maxW="44"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </Select>
          </HStack>
        </HStack>
        <PaginationControls
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
        <Text>
          <GatsbyLink to="/tags">← All tags</GatsbyLink>
        </Text>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
          {currentPageArticles.map((article, _index) => {
            const authorAndSource = [
              ...new Set([article.author, article.source.name].filter(Boolean)),
            ].join(", ");
            return (
              <Card
                key={article.id}
                as={Link}
                href={article.url}
                isExternal
                transition="all 0.2s ease-in-out"
                _hover={{
                  transform: "scale(1.02)",
                  boxShadow: "lg",
                  textDecoration: "none",
                }}
              >
                <CardBody display="flex" flexDirection="column">
                  {article.urlToImage && (
                    <Image
                      src={article.urlToImage}
                      alt={article.title}
                      borderRadius="lg"
                      mb={4}
                      height="200px"
                      objectFit="cover"
                    />
                  )}
                  <VStack align="stretch" spacing={3} flexGrow={1}>
                    <Heading size="md">{article.title}</Heading>
                    {authorAndSource && <Text>{authorAndSource}</Text>}
                    <Text fontSize="sm" color="gray.500" noOfLines={3}>
                      {article.description}
                    </Text>
                  </VStack>
                  {article.tags && article.tags.length > 0 && (
                    <HStack spacing={2} mt={4} wrap="wrap">
                      {getDisplayableTagsByIds(article.tags).map((tag) => (
                        <Tag
                          key={tag.id}
                          size="sm"
                          variant="solid"
                          bg={tag.color}
                          color="white"
                        >
                          {tag.name}
                        </Tag>
                      ))}
                    </HStack>
                  )}
                  <HStack
                    justify="space-between"
                    align="flex-end"
                    mt={article.tags && article.tags.length > 0 ? 2 : 4}
                  >
                    <Text fontSize="xs" color="gray.600" flexShrink={0}>
                      {new Date(article.publishedAt).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
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

export const Head: React.FC<PageProps<unknown, TagPageContext>> = ({
  pageContext,
}) => {
  const name = getTagById(pageContext.tagId)?.name ?? pageContext.tagId;
  return <title>Articles tagged: {name}</title>;
};

export default TagTemplate;
