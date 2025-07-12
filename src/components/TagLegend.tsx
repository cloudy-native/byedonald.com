import {
  Box,
  Button,
  Tag,
  Tooltip,
  Wrap,
  WrapItem,
  VStack,
  Text,
  HStack,
} from "@chakra-ui/react";
import React from "react";
import {
  getAllTagCategories,
  getTagsByCategoryId,
  Tag as TagType,
} from "../utils/tags";

interface TagLegendProps {
  activeTagIds: string[];
  onTagClick: (tagId: string) => void;
  relevantTagIds: string[];
}

const TagLegend: React.FC<TagLegendProps> = ({
  activeTagIds,
  onTagClick,
  relevantTagIds,
}) => {
  const tagCategories = getAllTagCategories();
  const allTagsSelected = activeTagIds.length === 0;

  return (
    <Box mb={8}>
      <Wrap spacing={4} align="flex-start">
        {tagCategories.map(category => {
          const isCategoryRelevant = relevantTagIds.includes(category.id);
          const tagsInCategory = getTagsByCategoryId(category.id);
          const relevantTagsInCategory = tagsInCategory.filter(tag =>
            relevantTagIds.includes(tag.id)
          );

          if (relevantTagsInCategory.length === 0 && !isCategoryRelevant) {
            return null;
          }

          return (
            <WrapItem key={category.id}>
              <Box
                borderWidth="1px"
                borderRadius="lg"
                p={3}
                boxShadow="sm"
              >
                <Text fontWeight="bold" color={category.color} mb={2}>
                  {category.name}
                </Text>
                <Wrap spacing={2} align="center">
                  {isCategoryRelevant && (
                    <WrapItem key={`${category.id}-cat`}>
                      <Tooltip
                        label={category.description}
                        placement="top"
                        hasArrow
                      >
                        <Tag
                          size="md"
                          variant="solid"
                          bg={category.color}
                          color="white"
                          cursor="pointer"
                          opacity={
                            allTagsSelected || activeTagIds.includes(category.id)
                              ? 1
                              : 0.4
                          }
                          onClick={() => onTagClick(category.id)}
                          _hover={{ opacity: 1 }}
                        >
                          (All)
                        </Tag>
                      </Tooltip>
                    </WrapItem>
                  )}
                  {relevantTagsInCategory.map((tag: TagType) => {
                    const isActive =
                      allTagsSelected || activeTagIds.includes(tag.id);
                    return (
                      <WrapItem key={tag.id}>
                        <Tooltip
                          label={tag.description}
                          placement="top"
                          hasArrow
                        >
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
            </WrapItem>
          );
        })}
      </Wrap>
      {!allTagsSelected && (
        <Button mt={4} size="sm" onClick={() => onTagClick("")}>
          Show All Articles
        </Button>
      )}
    </Box>
  );
};

export default TagLegend;
