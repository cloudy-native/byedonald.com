import * as Levenshtein from "fast-levenshtein";

const SIMILARITY_THRESHOLD = 10;

// --- NORMALIZATION / CANONICALIZATION HELPERS ---

/**
 * Canonicalize a URL by removing common tracking/query params and hashes,
 * normalizing host casing, and trimming trailing slashes.
 */
export function canonicalizeUrl(
  rawUrl: string | null | undefined,
): string | null {
  if (!rawUrl) return null;
  try {
    const u = new URL(rawUrl);
    // Remove known tracking params; default policy: drop all unless whitelisted
    const dropPrefixes = [
      "utm_",
      "mc_",
      "fbclid",
      "gclid",
      "igsh",
      "ref",
      "cmp",
      "cmpid",
    ]; // not exhaustive
    const whitelist: string[] = []; // keep none by default
    const toDelete: string[] = [];
    u.searchParams.forEach((_, key) => {
      const lower = key.toLowerCase();
      if (whitelist.includes(lower)) return;
      if (dropPrefixes.some((p) => lower.startsWith(p))) {
        toDelete.push(key);
        return;
      }
      // Drop everything else by default to maximize dedup; adjust if needed
      toDelete.push(key);
    });
    toDelete.forEach((k) => {
      u.searchParams.delete(k);
    });

    // Normalize
    u.hash = ""; // drop fragment
    u.hostname = u.hostname.toLowerCase();

    // Normalize pathname: remove trailing slash except root
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.replace(/\/+$/, "");
    }

    return u.toString();
  } catch {
    return rawUrl; // fallback: return raw if parsing fails
  }
}

/**
 * Normalize titles: lowercase, remove punctuation, collapse whitespace, strip common prefixes/suffixes
 */
export function normalizeTitle(title: string): string {
  const lower = title.toLowerCase().trim();
  // Strip common news prefixes like "opinion:", "analysis:", "breaking:" and wire prefixes like "ap -"
  let t = lower
    .replace(/^(opinion|analysis|breaking|live)\s*:\s*/i, "")
    .replace(/^[A-Z]{2,}\s*-\s*/i, ""); // e.g., "AP - "

  // Remove publication suffix like " - the new york times"
  t = t.replace(/\s*-\s+[a-z0-9 .,'’&-]+$/i, "");

  // Remove punctuation
  t = t.replace(/["'’`“”(),.:;!?]/g, " ");

  // Collapse whitespace
  t = t.replace(/\s+/g, " ").trim();

  return t;
}

/**
 * Token-set similarity (Jaccard) between two titles to catch reordering or minor variations.
 * Returns 0..1.
 */
export function tokenSetSimilarity(a: string, b: string): number {
  const as = new Set(a.split(" ").filter(Boolean));
  const bs = new Set(b.split(" ").filter(Boolean));
  if (as.size === 0 || bs.size === 0) return 0;
  let inter = 0;
  as.forEach((w) => {
    if (bs.has(w)) inter += 1;
  });
  const union = new Set<string>([...as, ...bs]).size;
  return inter / union;
}

// --- SHARED TYPES ---

export interface NewsSource {
  id: string | null;
  name: string;
}

export interface NewsArticle {
  source: NewsSource;
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

export interface TaggedNewsArticle extends NewsArticle {
  tags: string[];
  /**
   * Optional Unix timestamp (in seconds) derived from `publishedAt`.
   * Only present when `publishedAt` exists and is a valid date.
   */
  publishedAtTs?: number;
}

export interface NewsResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

export interface TaggedNewsResponse {
  status: string;
  totalResults: number;
  articles: TaggedNewsArticle[];
}

// --- REUSABLE FUNCTIONS ---

/**
 * Deduplicates an array of articles based on title similarity.
 * @param articles An array of articles (can be tagged or not).
 * @returns A new array with duplicate articles removed.
 *
 * We ued to check for desription too and make the threshold much larger.
 * But AP news syndicates, for exmaple, often put their publication as a prefix
 * and then it's not similar enough to be considered a duplicate, even though the title may be exact
 */
export function deduplicateArticles<T extends NewsArticle>(articles: T[]): T[] {
  const uniqueArticles: T[] = [];
  const seenUrlKeys = new Set<string>();

  for (const article of articles) {
    // 1) URL-based dedup (strict)
    const urlKey = canonicalizeUrl(article.url);
    if (urlKey) {
      if (seenUrlKeys.has(urlKey)) {
        continue; // duplicate by URL
      }
    }

    // 2) Title-based dedup (fuzzy)
    const title = article.title || "";
    if (!title) {
      // No title: rely only on URL; if no URL, keep it
      if (urlKey) seenUrlKeys.add(urlKey);
      uniqueArticles.push(article);
      continue;
    }

    const currentNorm = normalizeTitle(title);

    let isDuplicate = false;
    for (const u of uniqueArticles) {
      const otherNorm = normalizeTitle(u.title || "");
      if (!otherNorm) continue;

      const distance = Levenshtein.get(currentNorm, otherNorm);
      if (distance < SIMILARITY_THRESHOLD) {
        isDuplicate = true;
        break;
      }

      // If Levenshtein didn't catch it, use token-set Jaccard to capture reorders
      const jaccard = tokenSetSimilarity(currentNorm, otherNorm);
      if (jaccard >= 0.9) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      if (urlKey) seenUrlKeys.add(urlKey);
      uniqueArticles.push(article);
    }
  }

  return uniqueArticles;
}
