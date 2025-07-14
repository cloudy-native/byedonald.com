import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Card,
  CardBody,
  Container,
  filter,
  Heading,
  HStack,
  Image,
  Link,
  SimpleGrid,
  Tag,
  Text,
  VStack,
} from "@chakra-ui/react";
import { PageProps } from "gatsby";
import React, { useMemo, useState } from "react";
import { Article } from "../types/news";
import { getAllTags, getDisplayableTagsByIds } from "../utils/tags";
import { TagLegend } from "../components/TagLegend";

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
    articles.forEach(article => {
      article.tags.forEach(tagId => {
        tagIds.add(tagId);
      });
    });
    return tagIds;
  }, [articles]);

  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

  const handleTagClick = (tagId: string) => {
    setActiveTags(prev => {
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

  const filteredArticles = useMemo(() => {
    if (activeTags.size === 0) {
      return articles;
    }

    const activeTagsByCategory = Array.from(activeTags).reduce((acc, tagId) => {
      const tag = TAGS.find(t => t.id === tagId);
      if (tag) {
        const categoryId = tag.category.id;
        if (!acc[categoryId]) {
          acc[categoryId] = [];
        }
        acc[categoryId].push(tagId);
      }
      return acc;
    }, {} as Record<string, string[]>);

    return articles.filter(article => {
      const articleTags = new Set(article.tags);
      return Object.values(activeTagsByCategory).every(categoryTags =>
        categoryTags.some(tagId => articleTags.has(tagId))
      );
    });
  }, [activeTags, pageContext.articles]);

  const displayDate = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Box p={8}>
      <VStack spacing={8} align="stretch">
        <Heading as="h1" size="xl" mb={4}>
          Trump News for {displayDate}
        </Heading>

        <Accordion allowToggle mb={4}>
          <AccordionItem border="none">
            <h2>
              <AccordionButton>
                <Box as="span" flex='1' textAlign='left' fontWeight="bold">
                  Filter by Tags
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4}>
              <Text fontSize="sm" color="gray.600" mb={4}>
                Select tags to filter articles. Tags from different categories narrow results (e.g., 'Legal' AND 'Cohen'). Tags from the same category broaden them (e.g., 'Legal' OR 'Rallies').
              </Text>
              <TagLegend
                activeTags={activeTags}
                onTagClick={handleTagClick}
                onClear={handleClear}
                relevantTagIds={relevantTagIds}
              />
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
          {filteredArticles.map((article, index) => {
            const authorAndSource = [...new Set([article.author, article.source.name].filter(Boolean))].join(", ");

            return (
              <Card
                key={index}
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
                      {getDisplayableTagsByIds(article.tags).map(tag => (
                        // @ts-ignore

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
  const displayDate = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return <title>Trump News for {displayDate}</title>;
};

export default NewsDayTemplate;
