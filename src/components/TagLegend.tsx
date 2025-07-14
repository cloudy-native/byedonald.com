import {
  Box,
  Button,
  Heading,
  Tag,
  Tooltip,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import React from "react";
import { getAllTags, getAllTagCategories, TagInfo } from "../utils/tags";

// Get tag data once
const TAGS = getAllTags();
const TAG_CATEGORIES = getAllTagCategories();

interface TagLegendProps {
  activeTags: Set<string>;
  onTagClick: (tagId: string) => void;
  onClear: () => void;
  relevantTagIds: Set<string>;
}

export const TagLegend: React.FC<TagLegendProps> = ({
  activeTags,
  onTagClick,
  onClear,
  relevantTagIds,
}) => {
  return (
    <Box mb={8}>
      <VStack spacing={4} align="stretch">
        {TAG_CATEGORIES.map((category) => {
          const categoryTags = TAGS.filter(
            (tag) => tag.category.id === category.id && relevantTagIds.has(tag.id)
          );

          if (categoryTags.length === 0) {
            return null;
          }

          const isActiveCategory = categoryTags.some((tag) =>
            activeTags.has(tag.id)
          );

          return (
            <Box
              key={category.id}
              p={4}
              borderWidth={2}
              borderColor={isActiveCategory ? category.color : "gray.200"}
              borderRadius="md"
              width="100%"
            >
              <Wrap spacing={2} align="center">
                <Heading as="h4" size="sm" color={category.color} mr={2}>
                  {category.name}
                </Heading>
                <Tag
                  size="md"
                  variant="solid"
                  bg={category.color}
                  color="white"
                  cursor="pointer"
                  opacity={activeTags.has(category.id) ? 1 : 0.4}
                  onClick={() => onTagClick(category.id)}
                  _hover={{ opacity: 1 }}
                >
                  (All)
                </Tag>
              </Wrap>
              <Wrap spacing={2} mt={2}>
                {categoryTags.map((tag: TagInfo) => {
                  const isActive = activeTags.has(tag.id);
                  return (
                    <WrapItem key={tag.id}>
                      <Tooltip label={tag.description} placement="top" hasArrow>
                        <Tag
                          size="md"
                          variant="solid"
                          bg={category.color}
                          color="white"
                          cursor="pointer"
                          opacity={isActive ? 1 : 0.4}
                          onClick={() => onTagClick(tag.id)}
                          _hover={{ opacity: 1 }}
                        >
                          {tag.name}
                        </Tag>
                      </Tooltip>
                    </WrapItem>
                  );
                })}
              </Wrap>
            </Box>
          );
        })}
      </VStack>
      {activeTags.size > 0 && (
        <Button mt={4} size="sm" onClick={onClear}>
          Clear All Filters
        </Button>
      )}
    </Box>
  );
};

export default TagLegend;
