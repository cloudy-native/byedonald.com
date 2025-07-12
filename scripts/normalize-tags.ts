import * as fs from "fs/promises";
import * as path from "path";

// --- TYPE DEFINITIONS (simplified for this script) ---
interface Tag {
  id: string;
  name: string;
}

interface TagCategory {
  name: string;
  description: string;
  color: string;
  tags: Tag[];
}

interface TagDefinition {
  tagCategories: Record<string, TagCategory>;
}

interface TaggedNewsArticle {
  tags: string[];
  [key: string]: any; // Allow other properties
}

interface TaggedNewsResponse {
  articles: TaggedNewsArticle[];
  [key: string]: any; // Allow other properties
}

// --- MAIN LOGIC ---

/**
 * Creates a mapping from a tag's name (lowercase) to its ID.
 * @param {TagDefinition} tagDefinitions - The loaded tag definitions from tags.json.
 * @returns {Map<string, string>} A map where key is the lowercase tag name and value is the tag ID.
 */
/**
 * Creates a single, comprehensive map from any potential incorrect tag value
 * (lowercase name, lowercase id) to its canonical, correctly-cased ID.
 * @param {TagDefinition} tagDefinitions - The loaded tag definitions from tags.json.
 * @returns {Map<string, string>} A map for normalization.
 */
function createNormalizationMap(tagDefinitions: TagDefinition): Map<string, string> {
  const normalizationMap = new Map<string, string>();

  for (const [categoryKey, categoryData] of Object.entries(
    tagDefinitions.tagCategories
  )) {
    // Map the category's lowercase name to its canonical key
    normalizationMap.set(categoryData.name.toLowerCase(), categoryKey);
    // Map the category's lowercase key to its canonical key (for case-fixing)
    normalizationMap.set(categoryKey.toLowerCase(), categoryKey);

    for (const tag of categoryData.tags) {
      // Map the tag's lowercase name to its canonical ID
      normalizationMap.set(tag.name.toLowerCase(), tag.id);
      // Map the tag's lowercase ID to its canonical ID (for case-fixing)
      normalizationMap.set(tag.id.toLowerCase(), tag.id);
    }
  }
  return normalizationMap;
}

/**
 * Normalizes the tags in a single news data object.
 * @param {TaggedNewsResponse} newsData - The parsed JSON data from a tagged news file.
 * @param {Map<string, string>} normalizationMap - The mapping of tag names to IDs.
 * @returns {{normalizedData: TaggedNewsResponse, wasModified: boolean}} - The data with normalized tags and a flag indicating if changes were made.
 */
function normalizeTags(
  newsData: TaggedNewsResponse,
  normalizationMap: Map<string, string>
): { normalizedData: TaggedNewsResponse; wasModified: boolean } {
  let wasModified = false;
  const normalizedArticles = newsData.articles.map((article) => {
    if (!article.tags || article.tags.length === 0) {
      return article;
    }

    const newTags = article.tags.map((tag) => {
      const lowerCaseTag = tag.toLowerCase();
      const correctId = normalizationMap.get(lowerCaseTag);

      // If a correct ID is found and it's different from the original, we need to modify.
      if (correctId && correctId !== tag) {
        wasModified = true;
        return correctId;
      }

      // Otherwise, return the original tag.
      return tag;
    });

    // Remove duplicates that might result from normalization
    const uniqueTags = [...new Set(newTags)];
    if (uniqueTags.length !== article.tags.length) {
      wasModified = true;
    }

    return { ...article, tags: uniqueTags };
  });

  return {
    normalizedData: { ...newsData, articles: normalizedArticles },
    wasModified,
  };
}

/**
 * Main function to run the normalization script.
 */
async function runNormalization() {
  console.log("Starting tag normalization process...");

  // --- CONFIGURATION ---
  const TAGGED_NEWS_DIR = path.join(__dirname, "..", "data", "news", "tagged");
  const TAGS_FILE_PATH = path.join(
    __dirname,
    "..",
    "data",
    "tags",
    "tags.json"
  );

  try {
    // 1. Load tags and create the normalization map
    const tagsJson = await fs.readFile(TAGS_FILE_PATH, "utf-8");
    const tagDefinitions: TagDefinition = JSON.parse(tagsJson);
    const normalizationMap = createNormalizationMap(tagDefinitions);
    console.log(`Created a comprehensive map with ${normalizationMap.size} normalization entries.`);

    // 2. Process each file in the tagged directory
    const fileNames = await fs.readdir(TAGGED_NEWS_DIR);
    const jsonFiles = fileNames.filter((file) => file.endsWith(".json"));

    let filesModifiedCount = 0;

    for (const fileName of jsonFiles) {
      const filePath = path.join(TAGGED_NEWS_DIR, fileName);
      const fileContent = await fs.readFile(filePath, "utf-8");
      const newsData: TaggedNewsResponse = JSON.parse(fileContent);

      const { normalizedData, wasModified } = normalizeTags(newsData, normalizationMap);

      if (wasModified) {
        await fs.writeFile(filePath, JSON.stringify(normalizedData, null, 2));
        console.log(`Normalized and saved: ${fileName}`);
        filesModifiedCount++;
      }
    }

    if (filesModifiedCount === 0) {
      console.log(
        "All tagged files already have normalized IDs. No changes were needed."
      );
    } else {
      console.log(`
Normalization complete. Modified ${filesModifiedCount} file(s).`);
    }
  } catch (error) {
    console.error("An error occurred during the normalization process:", error);
    process.exit(1);
  }
}

runNormalization()
  .then(() => {
    console.log("Tag normalization process completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("An error occurred during the normalization process:", error);
    process.exit(1);
  });
