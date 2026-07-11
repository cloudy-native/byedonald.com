# byedonald.com

Static news archive tracking Donald Trump's second term — day-by-day articles, tags, sources, Algolia search, and the "500 Worst Things" timeline.

Built with **Astro** (static output) + React islands for interactive features. Deployed as static HTML to S3/CloudFront.

See the About page for image attributions.

## Stack

| Layer | Tech |
| --- | --- |
| Framework | Astro 6 (static) |
| Interactive UI | React islands (`client:load`) |
| Styling | Tailwind CSS + shadcn/ui |
| Search | Algolia + react-instantsearch |
| Data | JSON content collections (`data/news/tagged/`) |
| Deploy | AWS CDK → S3 + CloudFront |

## Prerequisites

```bash
npm install
```

Copy `.env.sample` to `.env` and set:

```bash
# Client-exposed (Search island)
PUBLIC_ALGOLIA_APP_ID=...
PUBLIC_ALGOLIA_API_KEY=...   # search-only key
PUBLIC_ALGOLIA_INDEX_NAME=byedonald

# Server/build only (indexing script — never ship to the client)
ALGOLIA_APP_ID=...
ALGOLIA_API_KEY=...          # admin key
ALGOLIA_INDEX_NAME=byedonald
```

## Develop

```bash
npm run dev
```

## Build, test, deploy

```bash
# Production static build → dist/
npm run build

# Property / unit tests
npm test

# Smoke test dist/ (page count + key pages)
npm run smoke

# Push tagged articles to Algolia
npm run index-algolia

# Sync dist/ to S3 (requires AWS credentials)
npm run deploy
```

### CDK deploy

In the `cdk` directory (use `aws-vault` or equivalent):

```bash
cd cdk
export AWS_REGION=us-east-1   # required for ACM certificates
cdk deploy
```

CloudFront can take a few minutes; invalidate `/*` if you need changes immediately.

## News pipeline

### Fetch

| Aggregator | Max req/day | Articles | Date range |
| --- | --- | --- | --- |
| [gnews.io](https://gnews.io) | 100 | 10 | Historical |
| [newsapi.org](https://newsapi.org) | 100 | 100 | Last 30 days |

```bash
export GNEWS_API_KEY='xxx'
npm run fetch-gnews.io -- 2025-01-31
npm run backfill-gnews.io

export NEWSAPI_API_KEY='xxx'
npm run fetch-newsapi.org -- 2025-01-31
npm run backfill-newsapi.org
```

### Tag

```bash
export ANTHROPIC_API_KEY='xxx'
export ANTHROPIC_MODEL='claude-sonnet-4-20250514'
# AWS credentials required for Bedrock path if used
npm run tag-news
npm run normalize-tags
```

## Site structure

| Route | Source |
| --- | --- |
| `/` | Calendar + countdown + search |
| `/news/[date]/` | Daily articles (filters as React island) |
| `/tags/`, `/tags/[slug]/` | Tag index + detail |
| `/sources/`, `/sources/[slug]/` | Source index + detail |
| `/worst-things/` | Interactive timeline |
| `/about/` | About |
| `404.html` / `error.html` | Not found (S3 error document) |

## Migration notes

Gatsby → Astro (Phase A) and Chakra → shadcn/ui + Tailwind (Phase B) are complete. Spec history lives in `.kiro/specs/gatsby-to-astro-shadcn-migration/`.
