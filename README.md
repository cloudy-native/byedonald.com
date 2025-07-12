# byedonald.com

# Build and index articles

```
export GATSBY_ALGOLIA_APP_ID=...
export GATSBY_ALGOLIA_API_KEY=...
export GATSBY_ALGOLIA_INDEX_NAME=byedonald

npm run build
```

# Tasks

## Fetch news

Set the API key

```
export GNEWS_API_KEY='xxx'
```

Get news for a given date

```
npm run fetch-gnews.io -- 2025-01-31
```

Backfill for missing dates

```
npm run backfill-gnews.io
```

## Tag news

News articles must be tagged before they can be displayed in the calendar.

Set the API key and model

```
export ANTHROPIC_API_KEY='xxx'
export ANTHROPIC_MODEL='claude-sonnet-4-20250514'
```

Tag the news

```
npm run tag-news
```

## Normalize tags

Sometimes tags are not applied to articles as intended by AI. This script normalizes them.

They can sometimes appear inn upper case, and sometime the `name` instead of the `id` is used.

```
npm run normalize-tags
```

