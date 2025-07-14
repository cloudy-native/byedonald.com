# byedonald.com

This is a static site built with Gatsby. It displays news articles relating to Donald Trump's second terms so we can comiserate, freak out, remember, etc.

See the About page for image attributions.

# News sources

We use one of 2 aggregators:

| Aggregator | Max Requests per Day | Number of Articles | Date Range |
| --- | --- | --- | --- |
| [gnews.io](https://gnews.io) | 100 | 10 | Way back |
| [newsapi.org](https://newsapi.org) | 100 | 100 | Last 30 days |

For recent dates we use newsapi.org, and for older dates we use gnews.io.

# Build and deploy

## Build and index articles

```
export ALGOLIA_APP_ID=...
export ALGOLIA_API_KEY=...
export ALGOLIA_INDEX_NAME=byedonald

npm run build
```

## Deploy

In the `cdk` directory, get credentials (we use `aws-vault`)

```
cd cdk
aws-vault exec stephen --
```

You need to deploy to `us-east-1` because of some restrictions on region support for certificates. So remember to set the region to `us-east-1` when you deploy if necessary. I'm in Thailand, and am always forgetting to do this.

```
export AWS_REGION=us-east-1
```

Deploy

```
cdk deploy
```

This uploads the contents of the `dist` directory to the S3 bucket origin for the CloudFront distribution.

It can take a few minutes for the changes to be visible. If you're in a hurry, you can create an invalidation of `/*` for the CloudFront distribution.

# Tasks

## Fetch news

### For dates > 30 days in the past

Use gnews.io.

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

### For dates < 30 days in the past

Use newsapi.org.

Set the API key

```
export NEWSAPI_API_KEY='xxx'
```

Get news for a given date

```
npm run fetch-newsapi.org -- 2025-01-31
```

Backfill for missing dates

```
npm run backfill-newsapi.org
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

Sometimes tags are not applied to articles as intended by AI. This script normalizes them. They can appear upper case, and the `name` instead of the `id` can be used.

```
npm run normalize-tags
```

# More background images

Thanks, Gemini, for the following ideas:

National Monuments & Landmarks
- Statue of Liberty: A powerful symbol of freedom and democracy.
- Mount Rushmore: A monumental sculpture of four U.S. presidents.
- Washington Monument: An iconic obelisk in the nation's capital.
- Independence Hall: The Philadelphia landmark where the Declaration of Independence and the Constitution were signed.
- The Liberty Bell: A historic symbol of American independence.

Historical & Cultural Symbols
- The Constitution: A stylized image of the "We the People" preamble.
- Apollo Moon Landing: An astronaut on the moon with the American flag, representing innovation and exploration.
- Baseball Field: A nod to "America's pastime."
- Fireworks Display: A classic image of celebration, perfect for months with patriotic holidays like July.

Natural Landscapes ("America the Beautiful")
- Grand Canyon: A breathtaking view of one of America's most famous natural wonders.
- Rocky Mountains: A majestic mountain range symbolizing the nation's natural beauty and rugged spirit.
- Yosemite Valley: Iconic views like El Capitan or Half Dome.
