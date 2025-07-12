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
  activeTags: Record<string, string[]>;
  onTagClick: (tagId: string, categoryId: string, isCategoryToggle?: boolean) => void;
  relevantTagIds: string[];
}

const TagLegend: React.FC<TagLegendProps> = ({
  activeTags,
  onTagClick,
  relevantTagIds,
}) => {
  const tagCategories = getAllTagCategories();
  const noTagsSelected = Object.keys(activeTags).length === 0;

  const handleClear = () => {
    onTagClick('', '', false);
  };

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
                minH="110px"
              >
                <Text fontWeight="bold" color={category.color} mb={2}>
                  {category.name}
                </Text>
                <Wrap spacing={2} align="center">
                  <WrapItem key={`${category.id}-all`}>
                    <Tooltip
                      label={`Toggle all ${category.name} tags`}
                      placement="top"
                      hasArrow
                    >
                      <Tag
                        size="md"
                        variant="solid"
                        bg={category.color}
                        color="white"
                        cursor="pointer"
                        onClick={() => onTagClick(category.id, category.id, true)}
                        opacity={relevantTagsInCategory.every(t => activeTags[category.id]?.includes(t.id)) ? 1 : 0.4}
                        _hover={{ opacity: 1 }}
                      >
                        (All)
                      </Tag>
                    </Tooltip>
                  </WrapItem>

                  {relevantTagsInCategory.map((tag: TagType) => {
                    const isActive = noTagsSelected || (activeTags[category.id] && activeTags[category.id].includes(tag.id));
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
                            onClick={() => onTagClick(tag.id, category.id)}
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
      {!noTagsSelected && (
        <Button mt={4} size="sm" onClick={handleClear}>
          Show All Articles
        </Button>
      )}
    </Box>
  );
};

export default TagLegend;
