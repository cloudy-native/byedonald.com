import type { GatsbyConfig } from "gatsby";
import dotenv from "dotenv";

dotenv.config();

const algoliaQuery = `
  query {
    allArticle {
      nodes {
        id
        author
        title
        description
        content
        url
        urlToImage
        publishedAt
        publishedAtTs
        source {
          name
        }
        internal {
          contentDigest
        }
      }
    }
  }
`;

const queries = [
  {
    query: algoliaQuery,
    indexName: "byedonald",
    transformer: ({ data }: { data: any }) =>
      data.allArticle.nodes.map((n: any) => ({
        ...n,
        // Flatten nested source name for better search and faceting
        sourceName: n?.source?.name ?? null,
      })),
  },
];

const config: GatsbyConfig = {
  siteMetadata: {
    title: `Bye Donald`,
    description: `A depressing calendar, with light at the end of the tunnel`,
    author: `Stephen Harrison`,
    siteUrl: `https://byedonald.com`,
  },
  graphqlTypegen: true,
  plugins: [
    "gatsby-plugin-sitemap",
    "gatsby-plugin-robots-txt",
    "gatsby-plugin-catch-links",
    {
      resolve: `gatsby-plugin-google-gtag`,
      options: {
        trackingIds: ["G-KT2X9S6YZH"],
        gtagConfig: {
          anonymize_ip: true,
          send_page_view: false,
        },
        pluginConfig: {
          head: true,
          respectDNT: true,
        },
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/src/images`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `news`,
        path: `${__dirname}/data/news/tagged/`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `tags`,
        path: `${__dirname}/data/tags/`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `worst-things`,
        path: `${__dirname}/data/worst-things/`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `backgrounds`,
        path: `${__dirname}/static/backgrounds`,
      },
    },
    `gatsby-transformer-json`,
    `gatsby-transformer-sharp`,
    `gatsby-plugin-sharp`,
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [
          {
            resolve: `gatsby-remark-images`,
            options: {
              maxWidth: 800,
              linkImagesToOriginal: false,
              showCaptions: true,
            },
          },
          {
            resolve: `gatsby-remark-responsive-iframe`,
            options: {
              wrapperStyle: `margin-bottom: 1.0725rem`,
            },
          },
          `gatsby-remark-prismjs`,
          `gatsby-remark-copy-linked-files`,
          `gatsby-remark-smartypants`,
        ],
      },
    },
    {
      // This plugin must be placed last in your list of plugins to ensure that it can query all the GraphQL data
      resolve: `gatsby-plugin-algolia`,
      options: {
        appId: process.env.GATSBY_ALGOLIA_APP_ID,
        // Use Admin API key without GATSBY_ prefix, so that the key isn't exposed in the application
        // Tip: use Search API key with GATSBY_ prefix to access the service from within components
        apiKey: process.env.ALGOLIA_API_KEY, // Once again, no GATSBY_ prefix because that is the search key that's safe to expose in the browser.
        indexName: process.env.GATSBY_ALGOLIA_INDEX_NAME, // for all queries
        queries,
        chunkSize: 10000, // default: 1000
        settings: {
          // Improve query relevance and snippet display
          searchableAttributes: [
            "unordered(author)",
            "unordered(sourceName)",
            "unordered(title)",
            "unordered(description)",
            "unordered(content)",
          ],
          attributesForFaceting: [
            "searchable(author)",
            "searchable(sourceName)",
          ],
          // Keep default ranking order but slightly favor newer content after textual relevance
          customRanking: ["desc(publishedAt)"],
          attributesToSnippet: ["description:15", "content:20"],
          snippetEllipsisText: "…",
        },
        mergeSettings: false, // optional, defaults to false. See notes on mergeSettings below
        concurrentQueries: false, // default: true
        dryRun: false, // default: false, only calculate which objects would be indexed, but do not push to Algolia
        continueOnFailure: false, // default: false, don't fail the build if Algolia indexing fails
        algoliasearchOptions: undefined, // default: { timeouts: { connect: 1, read: 30, write: 30 } }, pass any different options to the algoliasearch constructor
      },
    },
  ],
};

export default config;
