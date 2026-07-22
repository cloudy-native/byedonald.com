/**
 * Convert an arbitrary label into a URL-safe path segment.
 *
 * Supports non-Latin source names (e.g. "코리아타임스") via Unicode letter/number
 * classes. Falls back to "unknown" when the input has no letters or digits at
 * all — empty slugs are rejected by Astro as "Missing parameter: slug".
 */
export function slugify(s: string): string {
  const slug = String(s)
    .toLowerCase()
    .trim()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)+/g, "");

  return slug || "unknown";
}

export default slugify;
