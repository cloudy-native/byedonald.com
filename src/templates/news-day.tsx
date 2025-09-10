import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
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
  VStack,
} from "@chakra-ui/react";
import type { PageProps } from "gatsby";
import React, { useMemo, useState } from "react";
import { TagLegend } from "../components/TagLegend";
import type { Article } from "../types/news";
import { getAllTags, getDisplayableTagsByIds } from "../utils/tags";

// Get tag data once
const TAGS = getAllTags();

interface NewsDayPageContext {
  date: string;
  articles: Article[];
}

const NewsDayTemplate: React.FC<PageProps<null, NewsDayPageContext>> = ({
  pageContext,
}) => {
  const { date, articles } = pageContext;

  const relevantTagIds = useMemo(() => {
    const tagIds = new Set<string>();
    articles.forEach((article) => {
      article.tags.forEach((tagId) => {
        tagIds.add(tagId);
      });
    });
    return tagIds;
  }, [articles]);

  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [activeSources, setActiveSources] = useState<Set<string>>(new Set());
  const [activeAuthors, setActiveAuthors] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // Hydrate filters from URL once on mount (SSR-safe)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const parseSet = (key: string) => {
      const v = params.get(key);
      if (!v) return new Set<string>();
      return new Set(v.split(",").map(decodeURIComponent).filter(Boolean));
    };
    const tags = parseSet("t");
    const sources = parseSet("s");
    const authors = parseSet("a");
    const order = params.get("o") as "newest" | "oldest" | null;
    if (tags.size) setActiveTags(tags);
    if (sources.size) setActiveSources(sources);
    if (authors.size) setActiveAuthors(authors);
    if (order === "newest" || order === "oldest") setSortOrder(order);
  }, []);

  // Sync filters and sort to URL
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const setOrDelete = (key: string, set: Set<string>) => {
      if (set.size > 0) {
        params.set(key, Array.from(set).map(encodeURIComponent).join(","));
      } else {
        params.delete(key);
      }
    };
    setOrDelete("t", activeTags);
    setOrDelete("s", activeSources);
    setOrDelete("a", activeAuthors);
    if (sortOrder && sortOrder !== "newest") {
      params.set("o", sortOrder);
    } else {
      params.delete("o");
    }
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", newUrl);
  }, [activeTags, activeSources, activeAuthors, sortOrder]);

  const handleTagClick = (tagId: string) => {
    setActiveTags((prev) => {
      const newActiveTags = new Set(prev);
      if (newActiveTags.has(tagId)) {
        newActiveTags.delete(tagId);
      } else {
        newActiveTags.add(tagId);
      }
      return newActiveTags;
    });
  };

  const handleClear = () => setActiveTags(new Set());

  const handleSourceClick = (source: string) => {
    setActiveSources((prev) => {
      const newActiveSources = new Set(prev);
      if (newActiveSources.has(source)) {
        newActiveSources.delete(source);
      } else {
        newActiveSources.add(source);
      }
      return newActiveSources;
    });
  };

  const handleSourceClear = () => setActiveSources(new Set());

  const handleAuthorClick = (author: string) => {
    setActiveAuthors((prev) => {
      const next = new Set(prev);
      if (next.has(author)) {
        next.delete(author);
      } else {
        next.add(author);
      }
      return next;
    });
  };

  const handleAuthorClear = () => setActiveAuthors(new Set());

  const relevantSources = useMemo(() => {
    const sources = new Set<string>();
    articles.forEach((article) => {
      if (article?.source?.name) {
        sources.add(article.source.name);
      }
    });
    return Array.from(sources).sort();
  }, [articles]);

  const relevantAuthors = useMemo(() => {
    const authors = new Set<string>();
    const sources = new Set<string>();
    articles.forEach((article: Article) => {
      if (article?.source?.name) {
        sources.add(article.source.name);
      }
      if (article?.author) {
        authors.add(article.author);
      }
    });
    const filteredAuthors = Array.from(authors).filter((a) => !sources.has(a));
    return filteredAuthors.sort();
  }, [articles]);

  // Build adjacency maps for dynamic enabling
  const adjacency = useMemo(() => {
    const authorsBySource = new Map<string, Set<string>>();
    const sourcesByAuthor = new Map<string, Set<string>>();
    const allSources = new Set<string>();
    const allAuthors = new Set<string>();

    articles.forEach((article: Article) => {
      const sourceName = article?.source?.name;
      const authorName = article?.author;

      if (sourceName) {
        allSources.add(sourceName);
      }
      // Ignore authors equal to the source, per rule
      if (authorName && authorName !== sourceName) {
        allAuthors.add(authorName);
      }

      if (sourceName && authorName && authorName !== sourceName) {
        if (!authorsBySource.has(sourceName)) {
          authorsBySource.set(sourceName, new Set());
        }
        const sourceAuthors = authorsBySource.get(sourceName);
        if (sourceAuthors) {
          sourceAuthors.add(authorName);
        }

        if (!sourcesByAuthor.has(authorName)) {
          sourcesByAuthor.set(authorName, new Set());
        }
        const authorSources = sourcesByAuthor.get(authorName);
        if (authorSources) {
          authorSources.add(sourceName);
        }
      }
    });

    return { authorsBySource, sourcesByAuthor, allSources, allAuthors };
  }, [articles]);

  // Compute which chips should be enabled given current selections
  const enabledAuthors = useMemo(() => {
    if (activeSources.size === 0) return adjacency.allAuthors;
    const acc = new Set<string>();
    activeSources.forEach((src) => {
      const set = adjacency.authorsBySource.get(src);
      if (set)
        set.forEach((a) => {
          acc.add(a);
        });
    });
    return acc;
  }, [activeSources, adjacency]);

  const enabledSources = useMemo(() => {
    if (activeAuthors.size === 0) return adjacency.allSources;
    const acc = new Set<string>();
    activeAuthors.forEach((auth) => {
      const set = adjacency.sourcesByAuthor.get(auth);
      if (set)
        set.forEach((s) => {
          acc.add(s);
        });
    });
    return acc;
  }, [activeAuthors, adjacency]);

  const filteredArticles = useMemo(() => {
    if (
      activeTags.size === 0 &&
      activeSources.size === 0 &&
      activeAuthors.size === 0
    ) {
      return articles;
    }

    const activeTagsByCategory = Array.from(activeTags).reduce(
      (acc, tagId) => {
        const tag = TAGS.find((t) => t.id === tagId);
        if (tag) {
          const categoryId = tag.category.id;
          if (!acc[categoryId]) {
            acc[categoryId] = [];
          }
          acc[categoryId].push(tagId);
        }
        return acc;
      },
      {} as Record<string, string[]>,
    );

    return articles.filter((article) => {
      const sourceName = article?.source?.name ?? "";
      const authorName = article?.author ?? "";
      const sourceMatch =
        activeSources.size === 0 ||
        (sourceName && activeSources.has(sourceName));
      const authorMatch =
        activeAuthors.size === 0 ||
        (authorName && activeAuthors.has(authorName));

      if (!sourceMatch || !authorMatch) {
        return false;
      }

      if (activeTags.size === 0) {
        return true;
      }
      const articleTags = new Set(article.tags);
      return Object.values(activeTagsByCategory).every((categoryTags) =>
        categoryTags.some((tagId) => articleTags.has(tagId)),
      );
    });
  }, [activeTags, activeSources, activeAuthors, articles]);

  // Apply sorting
  const sortedArticles = useMemo(() => {
    const copy = [...filteredArticles];
    copy.sort((a, b) => {
      const at = new Date(a.publishedAt).getTime();
      const bt = new Date(b.publishedAt).getTime();
      return sortOrder === "newest" ? bt - at : at - bt;
    });
    return copy;
  }, [filteredArticles, sortOrder]);

  const displayDate = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalCount = articles.length;
  const visibleCount = sortedArticles.length;
  const articleWord = (n: number) => (n === 1 ? "article" : "articles");

  return (
    <Box p={8}>
      <VStack spacing={8} align="stretch">
        <Heading as="h1" size="xl" mb={4}>
          Trump News for {displayDate}
        </Heading>
        <HStack justify="space-between" align="center">
          <Text fontSize="sm" color="gray.600">
            {activeTags.size > 0 ||
            activeSources.size > 0 ||
            activeAuthors.size > 0 ? (
              <>
                Showing {visibleCount} of {totalCount} {articleWord(totalCount)}
              </>
            ) : (
              <>
                {totalCount} {articleWord(totalCount)}
              </>
            )}
          </Text>
          <HStack>
            <Text fontSize="sm" color="gray.600">
              Sort
            </Text>
            <Select
              size="sm"
              value={sortOrder}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const v = e.target.value === "oldest" ? "oldest" : "newest";
                setSortOrder(v);
              }}
              maxW="44"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </Select>
          </HStack>
        </HStack>

        <Accordion allowMultiple mb={4}>
          <AccordionItem>
            <h2>
              <AccordionButton>
                <AccordionIcon />
                <HStack flex="1" spacing={4} alignItems="center">
                  <Box fontWeight="bold">Filter by Source & Author</Box>
                  {activeSources.size > 0 && (
                    <Text
                      as="button"
                      fontSize="sm"
                      color="blue.500"
                      variant="solid"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSourceClear();
                      }}
                    >
                      Clear source filters
                    </Text>
                  )}
                  {activeAuthors.size > 0 && (
                    <Text
                      as="button"
                      fontSize="sm"
                      color="blue.500"
                      variant="solid"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAuthorClear();
                      }}
                    >
                      Clear author filters
                    </Text>
                  )}
                </HStack>
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4}>
              <VStack align="stretch" spacing={3}>
                <Box fontWeight="semibold">Sources</Box>
                <HStack wrap="wrap" spacing={2}>
                  {relevantSources.map((source) => {
                    const disabled = !enabledSources.has(source);
                    return (
                      <Tag
                        key={source}
                        size="md"
                        variant={
                          activeSources.has(source) ? "solid" : "outline"
                        }
                        colorScheme="blue"
                        onClick={() => !disabled && handleSourceClick(source)}
                        cursor={disabled ? "not-allowed" : "pointer"}
                        opacity={disabled ? 0.4 : 1}
                        pointerEvents={disabled ? "none" : "auto"}
                      >
                        {source}
                      </Tag>
                    );
                  })}
                </HStack>

                {relevantAuthors.length > 0 && (
                  <>
                    <Box fontWeight="semibold" mt={2}>
                      Authors
                    </Box>
                    <HStack wrap="wrap" spacing={2}>
                      {relevantAuthors.map((author) => {
                        const disabled = !enabledAuthors.has(author);
                        return (
                          <Tag
                            key={author}
                            size="md"
                            variant={
                              activeAuthors.has(author) ? "solid" : "outline"
                            }
                            colorScheme="purple"
                            onClick={() =>
                              !disabled && handleAuthorClick(author)
                            }
                            cursor={disabled ? "not-allowed" : "pointer"}
                            opacity={disabled ? 0.4 : 1}
                            pointerEvents={disabled ? "none" : "auto"}
                          >
                            {author}
                          </Tag>
                        );
                      })}
                    </HStack>
                  </>
                )}
              </VStack>
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem>
            <h2>
              <AccordionButton>
                <AccordionIcon />
                <HStack flex="1" spacing={4} alignItems="center">
                  <Box fontWeight="bold">Filter by Tags</Box>
                  {activeTags.size > 0 && (
                    <Text
                      as="button"
                      fontSize="sm"
                      color="blue.500"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClear();
                      }}
                    >
                      Clear tag filters
                    </Text>
                  )}
                </HStack>
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4}>
              <Text fontSize="sm" color="gray.600" mb={4}>
                Select tags to filter articles. Tags from different categories
                narrow results (e.g., 'Legal' AND 'Cohen'). Tags from the same
                category broaden them (e.g., 'Legal' OR 'Rallies').
              </Text>
              <TagLegend
                activeTags={activeTags}
                onTagClick={handleTagClick}
                onClear={handleClear}
                relevantTagIds={relevantTagIds}
                showClear={false}
              />
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
          {sortedArticles.map((article) => {
            const authorAndSource = [
              ...new Set([article.author, article.source.name].filter(Boolean)),
            ].join(", ");

            return (
              <Card
                key={article.url}
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
      </VStack>
    </Box>
  );
};

export const Head: React.FC<PageProps<null, NewsDayPageContext>> = ({
  pageContext,
}) => {
  const { date } = pageContext;
  const displayDate = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return <title>Trump News for {displayDate}</title>;
};

export default NewsDayTemplate;
