import tagsData from "../../data/tags/tags.json";

// --- NEW UNIFIED TAG SYSTEM ---

/**
 * A standard interface for any item that can be displayed as a tag,
 * whether it's a specific tag or a whole category.
 */
export interface DisplayableTag {
  id: string;
  name: string;
  color: string;
}

/**
 * A pre-computed map for efficient lookups of any tag or category by its ID.
 * This is the new single source of truth for tag information.
 */
const displayableTagMap = new Map<string, DisplayableTag>();

// Populate the map with all categories and their specific tags
for (const categoryId in tagsData.tagCategories) {
  const category = tagsData.tagCategories[categoryId as keyof typeof tagsData.tagCategories];
  
  // Add the category itself as a displayable tag
  displayableTagMap.set(categoryId, {
    id: categoryId,
    name: category.name,
    color: category.color,
  });

  // Add all the individual tags within the category
  for (const tag of category.tags) {
    displayableTagMap.set(tag.id, {
      id: tag.id,
      name: tag.name,
      color: category.color, // Tags inherit color from their category
    });
  }
}

/**
 * The new, efficient function to get displayable tag info for an array of IDs.
 * It can resolve both category IDs and specific tag IDs.
 * @param {string[]} ids - An array of tag or category IDs.
 * @returns {DisplayableTag[]} An array of displayable tag objects.
 */
export const getDisplayableTagsByIds = (ids: string[]): DisplayableTag[] => {
  if (!ids) return [];
  return ids
    .map(id => displayableTagMap.get(id))
    .filter((tag): tag is DisplayableTag => !!tag);
};


// --- LEGACY & SHARED TYPES / FUNCTIONS ---

export interface Tag {
  id: string;
  name: string;
  description: string;
}

export interface TagCategory {
  name: string;
  description: string;
  color: string;
  tags: Tag[];
}

export interface TagCategoryWithId extends TagCategory {
  id: string;
}

export interface TagInfo extends Tag {
  category: {
    id: string;
    name: string;
    description: string;
    color: string;
  };
}

const allTags: TagInfo[] = [];

for (const categoryId in tagsData.tagCategories) {
  const category = tagsData.tagCategories[categoryId as keyof typeof tagsData.tagCategories];
  for (const tag of category.tags) {
    allTags.push({
      ...tag,
      category: {
        id: categoryId,
        name: category.name,
        description: category.description,
        color: category.color,
      },
    });
  }
}

export const getTagById = (id: string): TagInfo | undefined => {
  return allTags.find(tag => tag.id === id);
};

export const getCategoryByTagId = (tagId: string): TagCategoryWithId | undefined => {
  for (const categoryId in tagsData.tagCategories) {
    const category = tagsData.tagCategories[categoryId as keyof typeof tagsData.tagCategories];
    if (category.tags.some(tag => tag.id === tagId)) {
      return { ...category, id: categoryId };
    }
  }
  return undefined;
};

// Kept for any other part of the app that might still use it
export const getTagsByIds = (ids: string[]): TagInfo[] => {
  return ids.map(id => getTagById(id)).filter((tag): tag is TagInfo => !!tag);
};

export const getAllTags = (): TagInfo[] => {
  return allTags;
};

export const getTagsByCategoryId = (categoryId: string): Tag[] => {
  const category = (tagsData.tagCategories as any)[categoryId];
  return category ? category.tags : [];
};

export const getAllTagCategories = () => {
  return Object.entries(tagsData.tagCategories).map(([id, categoryData]) => ({
    id,
    ...categoryData,
  }));
};
