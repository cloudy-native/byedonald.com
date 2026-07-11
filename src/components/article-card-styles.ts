/**
 * Shared class strings for article cards and grids.
 * Used by Astro ArticleCard and unit tests.
 */

/** Hover: scale 1.02, elevated shadow, 200ms transition (Req 7.5) */
export const articleCardClasses =
  "group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition duration-200 hover:scale-[1.02] hover:shadow-lg";

/** 1 col default, 2 at md (768px), 3 at lg (1024px) (Req 7.6) */
export const articlesGridClasses =
  "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3";

export const articleTitleClasses =
  "text-base font-semibold leading-snug text-blue-700 dark:text-blue-300 group-hover:underline";

export const articleDescriptionClasses =
  "mt-2 line-clamp-3 text-sm text-muted-foreground";

export const articleMetaClasses =
  "mt-auto flex flex-wrap gap-2 pt-3 text-xs text-muted-foreground";
