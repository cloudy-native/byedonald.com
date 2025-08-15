import { Box, Heading, Tag, VStack, Text, Wrap, WrapItem, Tooltip } from "@chakra-ui/react";
import { Link as GatsbyLink, PageProps } from "gatsby";
import React from "react";
import { getAllTags, getAllTagCategories, TagInfo } from "../utils/tags";
import { slugify } from "../utils/slugify";

interface TagsIndexContext {
  tags: string[]; // tag IDs passed from gatsby-node (used to build links)
}

// using shared slugify util

// Preload tag metadata and categories for grouping/coloring
const TAGS = getAllTags();
const TAG_CATEGORIES = getAllTagCategories();

const TagsIndexPage: React.FC<PageProps<unknown, TagsIndexContext>> = ({ pageContext }) => {
  const { tags = [] } = pageContext;
  const tagIdSet = new Set(tags);

  // Only include TagInfo for the IDs present; sort within each category by display name
  const tagsByCategory: Record<string, TagInfo[]> = {};
  for (const tag of TAGS) {
    if (!tagIdSet.has(tag.id)) continue;
    const cid = tag.category.id;
    if (!tagsByCategory[cid]) tagsByCategory[cid] = [];
    tagsByCategory[cid].push(tag);
  }
  Object.values(tagsByCategory).forEach(list => list.sort((a, b) => a.name.localeCompare(b.name)));

  // Count selected tags
  const totalCount = tags.length;

  return (
    <Box p={8}>
      <VStack align="stretch" spacing={6}>
        <Heading as="h1" size="xl">All Tags</Heading>
        <Text fontSize="sm" color="gray.600">{totalCount} tags</Text>

        <Wrap spacing={4}>
          {TAG_CATEGORIES.map(category => {
            const categoryTags = tagsByCategory[category.id] || [];
            if (categoryTags.length === 0) return null;

            return (
              <WrapItem key={category.id}>
                <Box p={4} borderWidth={2} borderColor={category.color} borderRadius="md">
                  <Heading as="h4" size="sm" color={category.color} mb={2}>
                    {category.title}
                  </Heading>
                  <Wrap spacing={2}>
                    {categoryTags.map(tag => (
                      <WrapItem key={tag.id}>
                        <Tooltip label={tag.description} placement="top" hasArrow>
                          <Tag
                            as={GatsbyLink}
                            to={`/tags/${slugify(tag.id)}/`}
                            size="md"
                            variant="solid"
                            bg={category.color}
                            color="white"
                            _hover={{ textDecoration: "none", opacity: 0.95 }}
                          >
                            {tag.name}
                          </Tag>
                        </Tooltip>
                      </WrapItem>
                    ))}
                  </Wrap>
                </Box>
              </WrapItem>
            );
          })}
        </Wrap>
      </VStack>
    </Box>
  );
};

export default TagsIndexPage;
