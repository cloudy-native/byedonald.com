import * as fs from "node:fs/promises";
import * as path from "node:path";

// --- TYPE DEFINITIONS (simplified for this script) ---
interface Tag {
  id: string;
  name: string;
}

interface TagCategory {
  title: string; // Changed from 'name' to 'title'
  description: string;
  color: string;
  tags: Tag[];
}

// The new format is an array of categories directly.
type TagDefinition = TagCategory[];

interface TaggedNewsArticle {
  tags: string[];
  [key: string]: unknown; // Allow other properties
}

interface TaggedNewsResponse {
  articles: TaggedNewsArticle[];
  [key: string]: unknown; // Allow other properties
}

// --- MAIN LOGIC ---

/**
 * Clean an arbitrary tag string into a consistent snake_case ID.
 * - Lowercase
 * - Trim
 * - Replace spaces and hyphens with underscores
 * - Remove diacritics
 * - Remove non [a-z0-9_]
 * - Collapse multiple underscores
 * - Trim leading/trailing underscores
 */
function cleanTagId(raw: string): string {
  if (!raw) return raw;
  // Remove diacritics
  const noDiacritics = raw.normalize("NFKD").replace(/\p{Diacritic}+/gu, "");
  return String(noDiacritics)
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]+/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Creates a single, comprehensive map from any potential incorrect tag value
 * (lowercase name, lowercase id) to its canonical, correctly-cased ID.
 * @param {TagDefinition} tagDefinitions - The loaded tag definitions from new-tags.json.
 * @returns {Map<string, string>} A map for normalization.
 */
function createNormalizationMap(
  tagDefinitions: TagDefinition,
): Map<string, string> {
  const normalizationMap = new Map<string, string>();
  const canonicalIds = new Set<string>();

  // The new format is an array of categories.
  for (const category of tagDefinitions) {
    // In the new format, there's no separate category key like 'government_administration'.
    // The primary items to normalize are the tags themselves.
    for (const tag of category.tags) {
      // Map the tag's lowercase name to its canonical ID
      normalizationMap.set(tag.name.toLowerCase(), tag.id);
      // Map the tag's lowercase ID to its canonical ID (for case-fixing)
      normalizationMap.set(tag.id.toLowerCase(), tag.id);
      canonicalIds.add(tag.id);
    }
  }

  // Add hard-coded aliases for common AI suggestions and variants
  for (const [aliasRaw, targetId] of getAliasMap()) {
    const alias = cleanTagId(aliasRaw);
    if (alias) {
      normalizationMap.set(alias, targetId);
    }
  }
  // Store canonicalIds inside the map under a reserved key for later access
  // (simplest way without changing function signatures elsewhere)
  normalizationMap.set(
    "__CANONICAL_IDS__",
    JSON.stringify(Array.from(canonicalIds)),
  );
  return normalizationMap;
}

/**
 * Hard-coded alias map: common variants/synonyms -> canonical tag IDs.
 * Keys are free-form; values must be valid canonical IDs from tags.json.
 */
function getAliasMap(): Array<[string, string]> {
  return [
    // Elections & Politics
    ["elections_and_politics", "elections_politics"],
    ["politics_elections", "elections_politics"],
    ["electionspolitics", "elections_politics"],
    ["presidential_2024", "2024_presidential"],
    ["election_2024", "2024_presidential"],
    ["2024_election", "2024_presidential"],
    ["2024_pres", "2024_presidential"],
    ["polls", "polling"],
    ["polls_surveys", "polling"],
    ["polls_approval", "polling"],
    ["public_opinion_polling", "polling"],
    ["approval_ratings", "polling"],
    ["gop", "republican_party"],
    ["republicans", "republican_party"],
    ["republican", "republican_party"],
    ["democrats", "democratic_party"],
    ["democratic", "democratic_party"],
    ["campaign_rallies", "campaign_events"],
    ["rallies", "campaign_events"],

    // Economy & Finance
    ["cost_of_living", "prices"],
    ["affordability", "prices"],
    ["federal_debt", "national_debt"],
    ["us_debt", "national_debt"],

    // Foreign Policy & International
    ["ukraine_russia", "ukraine"],
    ["war_in_ukraine", "ukraine"],
    ["israel_hamas", "israel"],
    ["gaza_conflict", "gaza"],
    ["economic_sanctions", "sanctions"],

    // Legal & Justice
    ["lawsuit", "lawsuits"],
    ["legal_claims", "lawsuits"],

    // Media & Communications
    ["content_moderation", "censorship"],
    ["factchecking", "fact_checking"],
    ["fact_checks", "fact_checking"],

    // Cross-category and general synonyms
    ["economy", "economy_finance"],
    ["economy_and_finance", "economy_finance"],
    ["media_and_communications", "media_communications"],
    ["foreign_policy_international", "foreign_policy"],
    ["social_issues_and_culture", "social_issues"],
    ["stocks_market", "stock_market"],
    ["stocks_markets", "stock_market"],
    ["crypto_currency", "cryptocurrency"],

    // High-frequency from report
    ["business", "economy_finance"],
    ["federal_reserve", "banking"],
    ["diplomacy", "foreign_policy"],
    ["entertainment", "media_communications"],
    ["employment", "economy_finance"],
    ["manufacturing", "economy_finance"],
    ["human_rights", "civil_rights"],
    ["history", "social_issues"],
    ["legal_and_justice", "legal_justice"],
    ["tariffs", "trade"],
    ["climate_change", "climate_policy"],
    ["courts", "legal_justice"],
    ["international_policy", "foreign_policy"],
    ["international_relations", "foreign_policy"],
    ["defense", "foreign_policy"],
    ["humanitarian_aid", "foreign_policy"],
    ["religion_culture", "social_issues"],
    ["insurance", "economy_finance"],
    ["corruption", "legal_justice"],
    ["privacy", "media_communications"],
    ["taiwan", "china"],
    ["india", "asia_pacific"],
    ["arts_culture", "social_issues"],
    ["indigenous_rights", "civil_rights"],
    ["congress_investigations", "legal_justice"],
    ["tech_regulation", "media_communications"],
    ["weather", "social_issues"],
    ["antisemitism", "civil_rights"],
    ["south_africa", "africa"],
    ["presidential_campaign", "elections_politics"],
    ["fundraising", "campaign_finance"],
    ["telecommunications", "media_communications"],
    ["panama", "latin_america"],
    ["pardon", "legal_justice"],
    ["humanitarian_crisis", "foreign_policy"],
    ["student_loans", "economy_finance"],
    ["g7", "international_organizations"],

    // New aliases from latest frequency report (>=3 and a few safe near-threshold)
    ["social_issues_culture", "social_issues"],
    ["golf", "sports"],
    ["climate", "climate_policy"],
    ["climate_crisis", "climate_policy"],
    ["policy", "foreign_policy"],
    ["international", "foreign_policy"],
    ["women_rights", "womens_rights"],
    ["police", "law_enforcement"],
    ["personal_security", "law_enforcement"],
    ["japan", "asia_pacific"],
    ["australia", "asia_pacific"],
    ["environmental", "climate_policy"],
    ["presidential_election", "elections_politics"],
  ];
}

/**
 * Normalizes the tags in a single news data object.
 * @param {TaggedNewsResponse} newsData - The parsed JSON data from a tagged news file.
 * @param {Map<string, string>} normalizationMap - The mapping of tag names to IDs.
 * @returns {{normalizedData: TaggedNewsResponse, wasModified: boolean}} - The data with normalized tags and a flag indicating if changes were made.
 */
function normalizeTags(
  newsData: TaggedNewsResponse,
  normalizationMap: Map<string, string>,
  unknowns: Map<string, number>,
): { normalizedData: TaggedNewsResponse; wasModified: boolean } {
  let wasModified = false;
  const normalizedArticles = newsData.articles.map((article) => {
    if (!article.tags || article.tags.length === 0) {
      return article;
    }

    const mappedTags = article.tags
      .filter((t) => typeof t === "string" && t.trim().length > 0)
      .map((tag) => {
        const cleaned = cleanTagId(tag);
        let mapped =
          normalizationMap.get(cleaned) ||
          normalizationMap.get(cleaned.toLowerCase());
        if (!mapped) {
          // Dynamic prefix stripping: if tag looks like "prefix_actualid" and actualid is canonical, map to it
          const prefixes = [
            "elections_politics",
            "foreign_policy",
            "media_communications",
            "legal_justice",
            "social_issues",
            "government_administration",
            "security_intelligence",
            "economy_finance",
            "state_regional",
            "regional_and_state",
            "regional_state",
          ];
          const canonicalIdsRaw = normalizationMap.get("__CANONICAL_IDS__");
          const canonicalIds: Set<string> = canonicalIdsRaw
            ? new Set<string>(JSON.parse(canonicalIdsRaw))
            : new Set<string>();
          for (const p of prefixes) {
            const prefix = `${p}_`;
            if (cleaned.startsWith(prefix)) {
              const candidate = cleaned.slice(prefix.length);
              if (canonicalIds.has(candidate)) {
                mapped = candidate;
                break;
              }
            }
          }
        }
        if (mapped) {
          if (mapped !== tag) wasModified = true;
          return mapped;
        }
        // Track unknown cleaned tags and drop them
        unknowns.set(cleaned, (unknowns.get(cleaned) || 0) + 1);
        if (cleaned !== tag) wasModified = true;
        return null; // mark for drop
      })
      .filter((t): t is string => Boolean(t));

    // Remove duplicates that might result from normalization
    const uniqueTags = [...new Set(mappedTags)];
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
    "tags.json",
  );

  try {
    // 1. Load tags and create the normalization map
    const tagsJson = await fs.readFile(TAGS_FILE_PATH, "utf-8");
    const tagDefinitions: TagDefinition = JSON.parse(tagsJson);
    const normalizationMap = createNormalizationMap(tagDefinitions);
    console.log(
      `Created a comprehensive map with ${normalizationMap.size} normalization entries.`,
    );
    const unknowns = new Map<string, number>();

    // 2. Process each file in the tagged directory
    const fileNames = await fs.readdir(TAGGED_NEWS_DIR);
    const jsonFiles = fileNames.filter((file) => file.endsWith(".json"));

    let filesModifiedCount = 0;

    for (const fileName of jsonFiles) {
      const filePath = path.join(TAGGED_NEWS_DIR, fileName);
      const fileContent = await fs.readFile(filePath, "utf-8");
      const newsData: TaggedNewsResponse = JSON.parse(fileContent);

      const { normalizedData, wasModified } = normalizeTags(
        newsData,
        normalizationMap,
        unknowns,
      );

      if (wasModified) {
        await fs.writeFile(filePath, JSON.stringify(normalizedData, null, 2));
        console.log(`Normalized and saved: ${fileName}`);
        filesModifiedCount++;
      }
    }

    if (unknowns.size > 0) {
      const sorted = Array.from(unknowns.entries()).sort((a, b) => b[1] - a[1]);
      console.log(
        `\nUnknown tags encountered (post-cleaning, dropped): ${unknowns.size}`,
      );
      console.log(
        sorted
          .slice(0, 200)
          .map(([tag, count]) => `${tag}:${count}`)
          .join(", "),
      );
    }

    if (filesModifiedCount === 0) {
      console.log(
        "All tagged files already have normalized IDs. No changes were needed.",
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
