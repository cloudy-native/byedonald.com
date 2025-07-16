import {
  Box,
  Button,
  Heading,
  Tag,
  Tooltip,
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
  const isFiltering = activeTags.size > 0;

  return (
    <Box mb={8}>
      <Wrap spacing={4}>
        {TAG_CATEGORIES.map((category) => {
          const categoryTags = TAGS.filter(
            (tag) =>
              tag.category.id === category.id && relevantTagIds.has(tag.id)
          );

          if (categoryTags.length === 0) {
            return null;
          }

          const categoryIsActive =
            !isFiltering || categoryTags.some((tag) => activeTags.has(tag.id));

          return (
            <WrapItem key={category.id}>
              <Box
                p={4}
                borderWidth={2}
                borderColor={categoryIsActive ? category.color : "gray.200"}
                borderRadius="md"
              >
                <Heading as="h4" size="sm" color={category.color} mb={2}>
                  {category.title}
                </Heading>
                <Wrap spacing={2}>
                  {categoryTags.map((tag: TagInfo) => {
                    const tagIsActive = !isFiltering || activeTags.has(tag.id);
                    return (
                      <WrapItem key={tag.id}>
                        <Tooltip label={tag.description} placement="top" hasArrow>
                          <Tag
                            size="md"
                            variant="solid"
                            bg={category.color}
                            color="white"
                            cursor="pointer"
                            opacity={tagIsActive ? 1 : 0.4}
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
            </WrapItem>
          );
        })}
      </Wrap>
      {isFiltering && (
        <Button mt={4} size="sm" onClick={onClear}>
          Clear All Filters
        </Button>
      )}
    </Box>
  );
};
