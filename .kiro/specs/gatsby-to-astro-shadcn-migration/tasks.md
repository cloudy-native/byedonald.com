# Implementation Plan: Gatsby to Astro + shadcn/ui Migration

## Overview

A two-phase migration converting byedonald.com from Gatsby 5 + Chakra UI v2 to Astro + shadcn/ui + Tailwind CSS. Phase A swaps the framework (keeping Chakra components as Astro islands), Phase B swaps the UI library (replacing Chakra with shadcn/ui). Each step produces a deployable build validated by `astro build` exit 0, page count within ±5, and key page smoke tests.

## Tasks

- [x] 1. Initialize Astro project alongside Gatsby
  - [x] 1.1 Create Astro project with React integration
    - Create `astro.config.mjs` with `@astrojs/react` integration, `output: 'static'`, `site: 'https://byedonald.com'`
    - Create `tsconfig.json` with `strict: true` for the Astro project
    - Install dependencies: `astro`, `@astrojs/react`, `react`, `react-dom`
    - Ensure `data/`, `cdk/`, and `scripts/` directories remain untouched
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 1.2 Set up environment variable validation
    - Create `src/utils/env.ts` with `validateEnv()` function that checks `PUBLIC_ALGOLIA_APP_ID`, `PUBLIC_ALGOLIA_API_KEY`, `PUBLIC_ALGOLIA_INDEX_NAME` using `import.meta.env`
    - Update `.env.sample` with new `PUBLIC_` prefixed variables and comments
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 1.3 Create smoke test script
    - Create `scripts/smoke-test.ts` that validates: build exit 0, page count within ±5 of baseline, key pages contain expected content elements
    - Store baseline page count from current Gatsby build
    - _Requirements: 11.1, 11.2, 11.3, 11.5_

- [x] 2. Content collections and data loading
  - [x] 2.1 Define content collection schema
    - Create `src/content/config.ts` with `newsCollection` using Zod schema matching the Article interface (source, author, title, description, url, urlToImage, publishedAt, content, tags, publishedAtTs)
    - Configure the collection to load from `data/news/tagged/` as a JSON data collection
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.2 Implement off-topic article filtering utility
    - Create a shared filtering function that excludes articles with `"off_topic"` in their tags array
    - Reuse in all page generators (news day, tags, sources)
    - _Requirements: 2.4, 3.5_

  - [x] 2.3 Write property test for off-topic filtering
    - **Property 3: Off-topic article filtering**
    - Generate random article arrays with varying tags, verify filter returns zero off-topic articles and retains all non-off-topic articles
    - **Validates: Requirements 2.4, 3.5**

  - [x] 2.4 Port slugify utility and types
    - Copy `src/utils/slugify.ts` and `src/types/news.ts` to the Astro project source
    - Verify slugify produces valid URL slugs (lowercase alphanumeric separated by hyphens)
    - _Requirements: 3.2, 3.3_

  - [x] 2.5 Write property tests for slugify
    - **Property 1: Slugify produces valid URL slugs**
    - For any non-empty string, verify output matches `^[a-z0-9]+(-[a-z0-9]+)*$` or empty string
    - **Property 2: Slugify is idempotent**
    - Verify `slugify(slugify(input)) === slugify(input)` for all inputs
    - **Validates: Requirements 3.2, 3.3**

- [x] 3. Checkpoint - Validate content loading
  - Ensure `astro build` exits 0 with content collections loading. Ask the user if questions arise.

- [x] 4. Static pages (about, 404)
  - [x] 4.1 Create BaseLayout Astro component
    - Create `src/layouts/BaseLayout.astro` with full-viewport-height container, sticky header slot, flexible main content area, and footer slot
    - Include `<title>` element with page-specific title pattern, defaulting to "Bye Donald"
    - Include Google Analytics gtag script in `<head>` with tracking ID `G-KT2X9S6YZH`, `anonymize_ip: true`, `send_page_view: false`, respecting DNT
    - _Requirements: 6.1, 9.1, 9.4, 9.5_

  - [x] 4.2 Create Header and Footer Astro components
    - Create `src/components/Header.astro` with site name linking to "/", nav links (Calendar, 500 Worst Things, Tags, Sources, About), color mode toggle, and responsive hamburger menu
    - Create `src/components/Footer.astro` with copyright year and author attribution
    - Implement color mode toggle as inline `<script>` persisting to localStorage, defaulting to OS preference
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 4.3 Create about and 404 pages
    - Create `src/pages/about.astro` as a pure Astro component with zero `<script>` tags
    - Create `src/pages/404.astro` as a standalone page with zero client-side JS
    - Add post-build step to copy `404.html` to `error.html` in the output directory
    - _Requirements: 5.1, 5.3, 10.2_

- [x] 5. Homepage with calendar and islands
  - [x] 5.1 Create static calendar month grid component
    - Create `src/components/MonthGrid.astro` rendering a 7-column grid for each month
    - Generate day buttons linking to `/news/[date]/` for dates with data, disabled for dates without
    - Render all 12 months (January–December) at build time as static HTML
    - _Requirements: 5.2, 5.5_

  - [x] 5.2 Port Countdown and Search as React islands
    - Create `src/components/react/Countdown.tsx` updating every 1 second showing days/hours/minutes/seconds until Jan 20, 2029 12:00:00 EST
    - Create `src/components/react/Search.tsx` wrapping existing Algolia InstantSearch component with `PUBLIC_` env vars
    - Use `client:load` directive for both components on the homepage
    - _Requirements: 4.1, 4.4, 4.5, 5.5_

  - [x] 5.3 Wire homepage (index.astro)
    - Create `src/pages/index.astro` composing MonthGrid (static), Countdown (island), and Search (island)
    - Set page title to "[Year] Calendar" pattern
    - _Requirements: 5.2, 5.5, 9.4_

- [x] 6. News day pages
  - [x] 6.1 Implement news day getStaticPaths
    - Create `src/pages/news/[date].astro` with `getStaticPaths()` generating a page per JSON file
    - Filter out off-topic articles in props; still create pages for dates with zero remaining articles
    - Pass filtered articles as props to the page component
    - _Requirements: 3.1, 3.5, 3.7_

  - [x] 6.2 Port NewsDayFilters as React island
    - Create `src/components/react/NewsDayFilters.tsx` providing tag/source/author filter controls and sort toggle (newest/oldest)
    - Persist filter state as URL query parameters (`t`, `s`, `a`, `o`) for shareability and reload persistence
    - Use `client:load` directive
    - _Requirements: 4.3_

  - [x] 6.3 Write property test for filter state URL round-trip
    - **Property 5: News-day filter state URL round-trip**
    - Generate random filter states (tag IDs, source names, author names, sort order), serialize to URL params, deserialize back, verify equivalence
    - **Validates: Requirements 4.3**

  - [x] 6.4 Implement news day page title generation
    - Create utility function producing "Trump News for {weekday}, {month} {day}, {year}" from a YYYY-MM-DD date string
    - Wire into `[date].astro` page `<title>` element
    - _Requirements: 9.4_

  - [x] 6.5 Write property test for title generation
    - **Property 6: News-day page title generation**
    - Generate random valid YYYY-MM-DD dates, verify output matches the expected title pattern
    - **Validates: Requirements 9.4**

- [x] 7. Tag and Source pages
  - [x] 7.1 Implement tag pages with getStaticPaths
    - Create `src/pages/tags/[slug].astro` generating a page per unique tag (using slugify), excluding off-topic articles
    - Create `src/pages/tags/index.astro` listing all tag slugs
    - Set page title to "Articles tagged: [name]" pattern
    - _Requirements: 3.2, 3.4, 9.4_

  - [x] 7.2 Implement source pages with getStaticPaths
    - Create `src/pages/sources/[slug].astro` generating a page per unique source name (using slugify), excluding off-topic articles
    - Create `src/pages/sources/index.astro` listing all source slugs
    - _Requirements: 3.3, 3.4_

  - [x] 7.3 Write property test for article schema validation
    - **Property 4: Article schema validation round-trip**
    - Generate valid article objects conforming to the interface, verify Zod schema accepts them; generate invalid objects (missing required fields, wrong types), verify schema rejects them
    - **Validates: Requirements 2.3**

- [x] 8. Checkpoint - Validate page generation parity
  - Compare full URL list between Astro and Gatsby builds. Ensure page count within ±5. Ask the user if questions arise.
  - _Requirements: 3.6, 11.2_

- [x] 9. Search island and Algolia integration
  - [x] 9.1 Wire Search component with full Algolia features
    - Ensure Search island connects to Algolia with credentials from `PUBLIC_` env vars
    - Implement: 300ms debounce, title highlighting, description snippets (max 15 words), responsive grid, faceted filtering (source/author with show-more), pagination (12/24/48), sort (relevance/newest/oldest), URL state restoration
    - Display "Search unavailable" message if env vars are missing
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 4.2_

  - [x] 9.2 Create Algolia indexing build script
    - Create `scripts/index-algolia.ts` that reads tagged news JSON, transforms articles (flatten source.name to sourceName), and pushes to Algolia index
    - Configure searchable attributes and faceting matching current gatsby-plugin-algolia settings
    - _Requirements: 8.9_

- [x] 10. Analytics, SEO, and sitemap
  - [x] 10.1 Add sitemap and robots.txt
    - Add `@astrojs/sitemap` integration with `site: 'https://byedonald.com'`
    - Create `public/robots.txt` permitting all crawlers and referencing sitemap URL
    - _Requirements: 9.2, 9.3_

  - [x] 10.2 Verify analytics integration
    - Confirm gtag script in BaseLayout `<head>` loads correctly with tracking ID, anonymize_ip, send_page_view:false, and DNT respect
    - Verify script is not injected when DNT is enabled
    - _Requirements: 9.1_

- [x] 11. Worst things page
  - [x] 11.1 Create worst-things page with islands
    - Create `src/pages/worst-things.astro` rendering filtering, search input, tag legend, and scroll-based month navigation as React islands with `client:load`
    - Create `src/components/react/WorstThings.tsx` with interactive features
    - _Requirements: 5.4_

- [x] 12. Validate and deploy (Astro replaces Gatsby)
  - [x] 12.1 Update deployment scripts and validate
    - Update `package.json` deploy script to `aws s3 sync ./dist/ s3://byedonald3stack-websitebucket75c24d94-qo97w51klbe9 --delete`
    - Verify `dist/index.html` and `dist/error.html` exist in output
    - Verify all static assets have content-hashed filenames (in `_astro/` directory)
    - Verify clean URL directory structure (`/page/index.html` served as `/page/`)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 12.2 Run full smoke test suite
    - Run smoke test: build exits 0, page count ±5, key pages return 200 + expected content
    - Verify URL parity between Gatsby and Astro builds (zero missing entries)
    - _Requirements: 11.1, 11.2, 11.3, 3.6_

- [x] 13. Checkpoint - Phase A complete
  - Ensure all tests pass and Astro build is fully validated as Gatsby replacement. Ask the user if questions arise.
  - **Done (2026-07-11):** Gatsby removed; `npm run build` is Astro; smoke + vitest green; NewsDayFilters wired; static assets in `public/`.

- [x] 14. Tailwind + shadcn setup (Phase B begins)
  - [x] 14.1 Install and configure Tailwind CSS + shadcn/ui
    - Install Tailwind CSS and configure with `tailwind.config.ts`
    - Create `src/styles/globals.css` with Tailwind directives and custom properties
    - Initialize shadcn/ui with required configuration
    - Add `@astrojs/tailwind` integration to `astro.config.mjs`
    - Verify build produces utility classes without errors
    - _Requirements: 7.1_

- [x] 15. Swap Layout/Header/Footer to Tailwind
  - [x] 15.1 Convert Layout to Tailwind classes
    - Replace Chakra layout primitives with Tailwind utility classes in `BaseLayout.astro`
    - Maintain full-viewport-height, sticky header, flexible main area
    - _Requirements: 7.2, 6.1_

  - [x] 15.2 Convert Header to Tailwind + shadcn
    - Replace Chakra components in `Header.astro` with Tailwind classes
    - Implement responsive hamburger menu with Tailwind responsive utilities
    - Replace `useColorModeValue` patterns with `dark:` variant classes and class-based dark mode toggle on `<html>`
    - _Requirements: 7.2, 7.4, 6.2, 6.3, 6.5_

  - [x] 15.3 Convert Footer to Tailwind
    - Replace Chakra components in `Footer.astro` with Tailwind utility classes
    - _Requirements: 7.2, 6.4_

- [x] 16. Swap ArticleCard to shadcn Card
  - [x] 16.1 Create ArticleCard as Astro component with shadcn Card
    - Create `src/components/ArticleCard.astro` using shadcn Card component
    - Implement hover animation: Tailwind transition with `scale-[1.02]`, `shadow-lg`, `duration-200`
    - Use responsive grid: 1 column default, 2 at md (768px), 3 at lg (1024px)
    - _Requirements: 7.5, 7.6_

  - [x] 16.2 Write unit tests for ArticleCard rendering
    - Verify card renders title, description, source, date
    - Verify hover classes are applied
    - Verify responsive grid breakpoints
    - _Requirements: 7.5, 7.6_

- [x] 17. Swap remaining components (tag chips, pagination, filters)
  - [x] 17.1 Convert tag chips to shadcn Badge
    - Create `src/components/TagChip.astro` using shadcn Badge component with Tailwind styling
    - _Requirements: 7.2_

  - [x] 17.2 Convert pagination controls to shadcn
    - Update `PaginationControls` to use shadcn Pagination component with Tailwind
    - _Requirements: 7.2_

  - [x] 17.3 Convert remaining interactive components
    - Update Search, NewsDayFilters, WorstThings islands to use shadcn/ui equivalents (Input, Select, Button, etc.)
    - Replace all `useColorModeValue` calls with `dark:` variants
    - _Requirements: 7.2, 7.4_

- [x] 18. Remove Chakra/Emotion dependencies
  - [x] 18.1 Remove Chakra UI and related packages
    - Remove `@chakra-ui/react`, `@chakra-ui/icons`, `@chakra-ui/styled-system`, `@chakra-ui/cli` from dependencies
    - Remove `@emotion/react`, `@emotion/styled`, `framer-motion`
    - Remove the `src/theme/` directory and `theme` script from package.json
    - Verify zero Chakra/Emotion/framer-motion in production bundle
    - _Requirements: 7.3_

  - [x] 18.2 Final build validation
    - Run `astro build` — verify exit 0
    - Run smoke test suite — page count ±5, key pages return 200 + expected content
    - Verify no Chakra references remain in source or bundle
    - _Requirements: 7.3, 11.1, 11.2, 11.3_

- [x] 19. Final checkpoint - Migration complete
  - Ensure all tests pass, build is clean, and deployment works. Ask the user if questions arise.
  - **Done (2026-07-11):** Tailwind + shadcn UI; Search/NewsDayFilters/WorstThings islands Chakra-free; Chakra/Emotion/framer-motion removed.


## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at Phase A midpoint, Phase A end, and Phase B end
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- Each numbered step is independently deployable: `astro build` exits 0, pages render, key URLs return 200
- Phase A (tasks 1–13) maintains Chakra UI components as islands — no styling changes
- Phase B (tasks 14–19) swaps Chakra for shadcn/ui — each component swap is independently revertible (Req 7.7)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "2.4"] },
    { "id": 3, "tasks": ["2.2", "2.5"] },
    { "id": 4, "tasks": ["2.3", "4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3"] },
    { "id": 6, "tasks": ["5.1", "5.2", "6.4"] },
    { "id": 7, "tasks": ["5.3", "6.1", "6.2"] },
    { "id": 8, "tasks": ["6.3", "6.5", "7.1", "7.2"] },
    { "id": 9, "tasks": ["7.3", "9.1", "9.2"] },
    { "id": 10, "tasks": ["10.1", "10.2", "11.1"] },
    { "id": 11, "tasks": ["12.1"] },
    { "id": 12, "tasks": ["12.2"] },
    { "id": 13, "tasks": ["14.1"] },
    { "id": 14, "tasks": ["15.1", "15.2", "15.3"] },
    { "id": 15, "tasks": ["16.1"] },
    { "id": 16, "tasks": ["16.2", "17.1", "17.2", "17.3"] },
    { "id": 17, "tasks": ["18.1"] },
    { "id": 18, "tasks": ["18.2"] }
  ]
}
```
