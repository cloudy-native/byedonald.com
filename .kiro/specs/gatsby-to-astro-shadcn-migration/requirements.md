# Requirements Document

## Introduction

Stepwise migration of the byedonald.com webapp from Gatsby 5 + Chakra UI v2 to Astro + shadcn/ui. The site must remain fully functional and deployable at every migration step. The migration order is: **Astro first, then shadcn/ui** — because Astro supports React components natively (via `@astrojs/react`), allowing existing Chakra UI components to run unchanged inside the new framework. Swapping the UI library simultaneously would break everything at once with no working baseline.

The site currently generates ~1,150 programmatic pages from JSON data (daily news, tag pages, source pages), provides Algolia-powered client-side search with faceting, and deploys as static HTML to S3/CloudFront.

## Glossary

- **Build_System**: The static site generator and its configuration (currently Gatsby 5, target Astro)
- **Page_Generator**: The mechanism that creates programmatic pages from JSON data files at build time (currently gatsby-node.js, target Astro content collections + getStaticPaths)
- **UI_Layer**: The component library used for styling and layout (currently Chakra UI v2, target shadcn/ui + Tailwind CSS)
- **Search_Module**: The Algolia-powered client-side search component using react-instantsearch
- **Data_Pipeline**: The JSON files in data/news/tagged/ and the build-time ingestion process
- **Deployment_Pipeline**: The S3 sync + CloudFront invalidation via CDK
- **Island_Component**: An Astro component directive (`client:load`, `client:visible`) that hydrates a React component on the client side
- **Content_Collection**: Astro's typed data layer for loading and validating structured content (JSON, Markdown, etc.)
- **Migration_Step**: A discrete, deployable increment of the migration where the site builds, serves all pages, and passes smoke tests

## Requirements

### Requirement 1: Astro Project Initialization

**User Story:** As a developer, I want to initialize an Astro project alongside the existing Gatsby project, so that I can incrementally migrate pages without breaking the current build.

#### Acceptance Criteria

1. WHEN the Astro project is initialized, THE Build_System SHALL produce an `astro.config.mjs` that includes `@astrojs/react` in the integrations array and sets `output: 'static'`
2. WHEN the Astro project is initialized, THE Build_System SHALL retain all existing `data/`, `cdk/`, and `scripts/` directories with no file additions, deletions, or modifications
3. WHEN the Astro project is built, THE Build_System SHALL produce static HTML output to a directory specified by the `outDir` property in `astro.config.mjs`
4. THE Build_System SHALL provide a `tsconfig.json` for the Astro project with `strict: true` enabled
5. WHEN the Astro project is built, THE Build_System SHALL complete with a zero exit code and produce at least one HTML file in the output directory
6. WHILE the Astro project is present in the repository, THE Build_System SHALL allow the existing Gatsby build (`gatsby build`) to complete successfully without errors

### Requirement 2: Content Collection Configuration

**User Story:** As a developer, I want the JSON data files to be loaded via Astro content collections, so that I have typed, validated data access replacing Gatsby's GraphQL layer.

#### Acceptance Criteria

1. WHEN a content collection is defined for tagged news data, THE Data_Pipeline SHALL load all JSON files from `data/news/tagged/` where each file contains a top-level object with an `articles` array, and each article entry is validated against a typed schema
2. WHEN a JSON file fails schema validation, THE Data_Pipeline SHALL fail the build and output the file path and the specific validation error to the build log
3. THE Content_Collection SHALL define a schema that validates each article object with the following fields: `source` (object with `id` as nullable string and `name` as string), `author` (string), `title` (string), `description` (string), `url` (string), `urlToImage` (nullable string), `publishedAt` (ISO 8601 datetime string), `content` (nullable string), `tags` (array of strings), and `publishedAtTs` (number)
4. WHEN the content collection is queried, THE Data_Pipeline SHALL exclude any article whose `tags` array contains the value "off_topic" from the returned results

### Requirement 3: Programmatic Page Generation

**User Story:** As a developer, I want all ~1,150 programmatic pages to be generated from JSON data using Astro's getStaticPaths, so that every existing URL continues to work.

#### Acceptance Criteria

1. WHEN the Astro project is built, THE Page_Generator SHALL create a page at `/news/[date]/` for each JSON file in the tagged news data directory, where `[date]` is the filename without extension (e.g., `2023-01-01.json` produces `/news/2023-01-01/`)
2. WHEN the Astro project is built, THE Page_Generator SHALL create a page at `/tags/[slug]/` for each unique tag found across all non-off-topic articles, where `[slug]` is produced by the slugify function (lowercase, trim, replace non-alphanumeric characters with hyphens, strip leading/trailing hyphens)
3. WHEN the Astro project is built, THE Page_Generator SHALL create a page at `/sources/[slug]/` for each unique `source.name` value found across all non-off-topic articles, where `[slug]` is produced by the same slugify function
4. WHEN the Astro project is built, THE Page_Generator SHALL create index pages at `/tags/` and `/sources/` that list all generated tag slugs and source slugs respectively
5. WHEN the Astro project is built, THE Page_Generator SHALL exclude articles whose `tags` array contains the value `off_topic` from news day pages, consistent with the existing Gatsby filtering behavior
6. WHEN the Astro build completes, THE Page_Generator SHALL produce a URL set where every path present in the current Gatsby build output is also present in the Astro build output, verified by comparing the full list of generated paths between both builds with zero missing entries
7. IF a tagged JSON data file contains no articles after filtering out off-topic articles, THEN THE Page_Generator SHALL still create the corresponding `/news/[date]/` page (with empty content)

### Requirement 4: React Component Migration to Astro Islands

**User Story:** As a developer, I want to run existing React+Chakra UI components inside Astro pages as islands, so that interactive features (search, filters, countdown) work immediately without rewriting the UI layer.

#### Acceptance Criteria

1. WHEN an interactive React component requires immediate user interaction (Search_Module, Countdown), THE Build_System SHALL hydrate the component using the `client:load` directive; WHEN a component is below the fold or non-critical to initial interaction, THE Build_System SHALL hydrate it using the `client:visible` directive
2. WHEN the Search_Module is rendered as an island, THE Search_Module SHALL connect to Algolia, display search results with title highlighting and description snippets, support faceted filtering by source and author, paginate results, and restore search state from the URL using InstantSearch routing with the history router
3. WHEN the news-day template is rendered, THE UI_Layer SHALL display article cards and provide tag, source, and author filter controls with a sort toggle (newest/oldest), and SHALL persist active filter and sort selections as URL query parameters (`t`, `s`, `a`, `o`) so that the page state is shareable and survives reload
4. WHEN the Countdown component is rendered as an island, THE UI_Layer SHALL update every 1 second and display the remaining days, hours, minutes, and seconds until January 20, 2029 at 12:00:00 EST
5. THE Build_System SHALL expose Algolia credentials to client-side island components via `import.meta.env` using the `PUBLIC_` prefix (PUBLIC_ALGOLIA_APP_ID, PUBLIC_ALGOLIA_API_KEY, PUBLIC_ALGOLIA_INDEX_NAME) as mapped from the existing GATSBY_-prefixed variables
6. IF an island component's required environment variables are missing or empty at build time, THEN THE Build_System SHALL fail the build and report which variables are undefined

### Requirement 5: Static Page Migration

**User Story:** As a developer, I want static pages (about, 404, worst-things) to be converted to Astro components without requiring client-side JavaScript, so that page load performance improves.

#### Acceptance Criteria

1. WHEN the about page or 404 page is built, THE Build_System SHALL render the page as a pure Astro component whose HTML output contains zero `<script>` tags and no client-side JavaScript bundle references
2. WHEN the homepage calendar view is rendered, THE Page_Generator SHALL display a 7-column month grid for each month (January through December) with day buttons linking to `/news/[date]/` pages for dates that have data, and disabled buttons for dates without data
3. WHEN the 404 page is rendered, THE Build_System SHALL produce a standalone `404.html` file at the site root that requires no client-side routing or JavaScript to display its content
4. WHEN the worst-things page is built, THE Build_System SHALL render the filtering, search input, tag legend, and scroll-based month navigation as Island_Components using `client:load`, since these features require client-side interactivity
5. WHEN the homepage is built, THE Build_System SHALL render the Countdown component and Search component as Island_Components, while rendering the calendar month grids as static HTML generated at build time

### Requirement 6: Layout and Navigation Migration

**User Story:** As a developer, I want the global layout (header, footer, page wrapper) to be implemented as an Astro layout, so that shared structure is rendered server-side without shipping a framework runtime.

#### Acceptance Criteria

1. THE Build_System SHALL define an Astro layout component that renders a full-viewport-height container with a sticky header, a flexible main content area, and a footer, and SHALL apply this layout to all pages
2. WHEN the layout is rendered, THE UI_Layer SHALL display a header containing the site name linking to "/", navigation links to Calendar ("/"), 500 Worst Things ("/worst-things/"), Tags ("/tags/"), Sources ("/sources/"), and About ("/about"), and a color mode toggle button
3. WHEN the layout is rendered on a viewport narrower than the desktop breakpoint, THE UI_Layer SHALL collapse the navigation links behind a hamburger menu button that toggles their visibility
4. WHEN the layout is rendered, THE UI_Layer SHALL display a footer containing the copyright year and author attribution
5. WHEN the user activates the color mode toggle, THE UI_Layer SHALL switch between light and dark mode and persist the selected preference in localStorage so that the preference is applied on subsequent page loads
6. IF no color mode preference exists in localStorage, THEN THE UI_Layer SHALL default to the operating system preference

### Requirement 7: UI Library Swap from Chakra to shadcn/ui

**User Story:** As a developer, I want to replace Chakra UI components with shadcn/ui + Tailwind CSS equivalents, so that the UI layer is framework-agnostic and produces smaller bundles.

#### Acceptance Criteria

1. WHEN the first shadcn/ui component is introduced into the codebase, THE Build_System SHALL have Tailwind CSS configured, producing utility classes, and generating output without build errors
2. WHEN a Chakra UI component is replaced, THE UI_Layer SHALL render output that preserves the same DOM structure hierarchy, spacing values (padding/margin), responsive breakpoints, and color palette such that no layout shift or content reflow occurs at any viewport width
3. WHEN all Chakra UI components are replaced, THE Build_System SHALL have zero Chakra UI, Emotion, or framer-motion dependencies in the production bundle
4. WHEN a component uses `useColorModeValue`, THE UI_Layer SHALL replace the call with Tailwind's `dark:` variant classes and a CSS class-based dark mode toggle that applies a `dark` class to the document root element
5. WHEN Card components are migrated, THE UI_Layer SHALL preserve hover animations using Tailwind transition utilities with scale transform of 1.02, elevated shadow (shadow-lg equivalent), and a transition duration of 200ms
6. WHEN responsive grid layouts are migrated, THE UI_Layer SHALL use Tailwind's responsive grid classes with 1 column at default (below 768px), 2 columns at the md breakpoint (768px), and 3 columns at the lg breakpoint (1024px)
7. IF a migrated shadcn/ui component causes a build error or renders no visible output, THEN THE Build_System SHALL allow the developer to revert the single component replacement without affecting other already-migrated components

### Requirement 8: Algolia Search Integration in Astro

**User Story:** As a developer, I want the Algolia search to work in the Astro site with the same features, so that users can search, filter by source/author, paginate, and sort results.

#### Acceptance Criteria

1. WHEN the Search_Module is rendered in Astro, THE Search_Module SHALL initialize the Algolia client with credentials from environment variables (PUBLIC_ALGOLIA_APP_ID, PUBLIC_ALGOLIA_API_KEY, PUBLIC_ALGOLIA_INDEX_NAME)
2. IF any required Algolia environment variable is missing or empty, THEN THE Search_Module SHALL display an informational message indicating search is unavailable instead of rendering the search UI
3. WHEN a search query is entered, THE Search_Module SHALL debounce input by 300ms before sending the query to Algolia
4. WHEN search results are displayed, THE Search_Module SHALL show article cards with title highlighting, description snippets (max 15 words), source/author, and publication date in a responsive grid (1 column on mobile, 2 on medium, 3 on large viewports)
5. WHEN facet filters are applied, THE Search_Module SHALL filter results by source name and author using chip-based UI showing up to 10 values initially with a show-more option to reveal up to 30
6. WHEN the user navigates away and returns, THE Search_Module SHALL restore the full search state (query, active facet filters, current page, sort order, hits per page) from the URL using InstantSearch routing with the history router
7. WHEN search results are displayed, THE Search_Module SHALL provide pagination controls and a hits-per-page selector with options of 12 (default), 24, and 48 results per page
8. WHEN search results are displayed, THE Search_Module SHALL provide a sort selector with options for relevance, newest first, and oldest first using Algolia replica indices
9. WHEN the site is built, THE Build_System SHALL provide a build script that reads articles from the tagged news data and pushes them to the Algolia index with searchable attributes (author, sourceName, title, description) and faceting on author and sourceName

### Requirement 9: Analytics and SEO Preservation

**User Story:** As a developer, I want Google Analytics, sitemap, and robots.txt to work in the Astro site, so that SEO and traffic tracking are uninterrupted during migration.

#### Acceptance Criteria

1. WHEN a page is loaded, THE Build_System SHALL inject the Google Analytics gtag script in the `<head>` with tracking ID G-KT2X9S6YZH, `anonymize_ip: true`, and `send_page_view: false`, and SHALL respect the user's Do Not Track browser preference by not loading the script when DNT is enabled
2. WHEN the site is built, THE Build_System SHALL generate a sitemap.xml at the site root listing all page URLs as absolute URLs using the base `https://byedonald.com`
3. WHEN the site is built, THE Build_System SHALL generate a robots.txt file at the site root that permits all crawler access and references the sitemap.xml URL
4. WHEN a page is rendered, THE Build_System SHALL include a `<title>` element matching the page-specific title pattern used in the current Gatsby build (e.g., "Trump News for [formatted date]" for news day pages, "Articles tagged: [name]" for tag pages, "[Year] Calendar" for the homepage)
5. IF a page does not define a page-specific title, THEN THE Build_System SHALL fall back to the site-wide default title "Bye Donald"

### Requirement 10: Deployment Pipeline Compatibility

**User Story:** As a developer, I want the Astro build output to deploy to S3/CloudFront using the existing CDK stack, so that the deployment process remains unchanged.

#### Acceptance Criteria

1. WHEN the Astro build completes, THE Build_System SHALL output only static files (HTML, CSS, JS, images, and fonts) to a single output directory that can be deployed using the existing `aws s3 sync <output-dir> s3://<bucket> --delete` command without modification to the sync flags
2. WHEN deployed to S3, THE Build_System SHALL produce an `index.html` file at the output directory root and an `error.html` file at the output directory root, matching the S3 static website hosting configuration in the CDK stack
3. WHEN deployed to S3/CloudFront, THE Deployment_Pipeline SHALL serve all existing page routes with the same URL paths as the current Gatsby build, using directory-style clean URLs (e.g., `/page/index.html` served as `/page/`)
4. THE Build_System SHALL generate static assets (CSS, JS) with content-hashed filenames so that the CloudFront CACHING_OPTIMIZED cache policy can cache them long-term without serving stale content after redeployment
5. IF the Astro output directory differs from Gatsby's `public/`, THEN THE Deployment_Pipeline SHALL update the `deploy` script in `package.json` to reference the correct output directory so that `npm run deploy` continues to function without additional manual steps
6. WHEN a deployment completes, THE Deployment_Pipeline SHALL invalidate the CloudFront distribution using the existing `aws cloudfront create-invalidation --paths "/*"` command with no changes to the invalidation pattern

### Requirement 11: Migration Step Validation

**User Story:** As a developer, I want each migration step to be validated before proceeding, so that I never deploy a broken site.

#### Acceptance Criteria

1. WHEN a Migration_Step is completed, THE Build_System SHALL produce a successful build with zero errors and zero unresolved warnings
2. WHEN a Migration_Step is completed, THE Page_Generator SHALL produce a page count within ±5 of the baseline count established by the previous Migration_Step, or within ±5 of the current Gatsby build page count if it is the first step
3. WHEN a Migration_Step is completed, THE Build_System SHALL pass a smoke test verifying that each key page (homepage, a news day page, a tag page, a source page, search) returns an HTTP 200 status and contains its expected primary content element (calendar grid, article list, tag heading, source heading, search input respectively)
4. IF a Migration_Step introduces a regression (missing page, broken link, or JavaScript error detected by the smoke test), THEN THE Build_System SHALL support rollback by providing a documented command to revert the working tree to the previous passing commit
5. IF the smoke test detects a key page returning a non-200 status or missing its expected primary content element, THEN THE Build_System SHALL report the failing page URL and the nature of the failure before halting the validation

### Requirement 12: Environment Variable Migration

**User Story:** As a developer, I want environment variables to work in both build-time and client-side contexts in Astro, so that API keys and configuration are accessible where needed.

#### Acceptance Criteria

1. WHEN an environment variable is used only during the build or in server-side code, THE Build_System SHALL access the variable via `import.meta.env` without a `PUBLIC_` prefix (applies to `ALGOLIA_API_KEY` and any other server-only secrets)
2. WHEN an environment variable is needed on the client side, THE Build_System SHALL prefix the variable with `PUBLIC_` and access it via `import.meta.env.PUBLIC_*`
3. WHEN migrating from Gatsby's `GATSBY_` prefix convention, THE Build_System SHALL map each client-exposed variable as follows: `GATSBY_ALGOLIA_APP_ID` to `PUBLIC_ALGOLIA_APP_ID`, `GATSBY_ALGOLIA_API_KEY` to `PUBLIC_ALGOLIA_API_KEY`, and `GATSBY_ALGOLIA_INDEX_NAME` to `PUBLIC_ALGOLIA_INDEX_NAME`
4. THE Build_System SHALL provide a `.env.sample` file listing every required environment variable with its name, a placeholder value, and a comment indicating whether it is build-only or client-exposed
5. IF a required environment variable listed in `.env.sample` is undefined or empty at build time, THEN THE Build_System SHALL fail the build and output an error message indicating which variable is missing

### Requirement 13: Build Performance

**User Story:** As a developer, I want the Astro build to complete in a reasonable time for ~1,150 pages, so that the development feedback loop remains fast.

#### Acceptance Criteria

1. WHEN the Astro project is built, THE Build_System SHALL generate all static pages with a total wall-clock build time (from command invocation to completion) no greater than 150% of the current Gatsby production build time measured on the same machine, and in no case exceeding 180 seconds
2. WHEN developing locally and a file is saved, THE Build_System SHALL reflect the change in the browser without a full page reload within 3 seconds for Astro component and React island file changes
3. WHEN the dev server is started, THE Build_System SHALL be ready to serve pages within 30 seconds of command invocation
4. IF the production build exceeds 180 seconds, THEN THE Build_System SHALL log a warning indicating the build duration and the number of pages generated
