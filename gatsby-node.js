const path = require("path");
const { slugify } = require("./utils/slugify");

const isOffTopicArticle = (article) =>
  Array.isArray(article?.tags) && article.tags.includes("off_topic");

exports.createPages = async ({ graphql, actions, reporter }) => {
  const { createPage } = actions;

  const newsDayTemplate = path.resolve("./src/templates/news-day.tsx");
  const tagTemplate = path.resolve("./src/templates/tag.tsx");
  const sourceTemplate = path.resolve("./src/templates/source.tsx");
  const tagsIndexTemplate = path.resolve("./src/templates/tags-index.tsx");
  const sourcesIndexTemplate = path.resolve(
    "./src/templates/sources-index.tsx",
  );

  // using shared slugify util

  const result = await graphql(`
    {
      allTaggedJson {
        edges {
          node {
            articles {
              author
              description
              publishedAt
              source {
                id
                name
              }
              tags
              title
              url
              urlToImage
            }
            parent {
              ... on File {
                name
              }
            }
          }
        }
      }
    }
  `);

  if (result.errors) {
    reporter.panicOnBuild(`Error while running GraphQL query.`, result.errors);
    return;
  }

  const newsNodes = result.data.allTaggedJson.edges;

  if (newsNodes.length > 0) {
    newsNodes.forEach(({ node }) => {
      const date = node.parent.name;
      const pagePath = `/news/${date}/`;

      const articles = Array.isArray(node.articles)
        ? node.articles.filter((a) => !isOffTopicArticle(a))
        : [];

      reporter.info(`Creating news page: ${pagePath}`);
      createPage({
        path: pagePath,
        component: newsDayTemplate,
        context: {
          date: date,
          articles,
        },
      });
    });
  }

  // Build Tag and Source pages
  const allArticlesRes = await graphql(`
    {
      allArticle {
        nodes {
          author
          title
          description
          url
          urlToImage
          publishedAt
          source { name }
          tags
        }
      }
    }
  `);
  if (allArticlesRes.errors) {
    reporter.panicOnBuild(
      `Error while querying allArticle for tag/source pages.`,
      allArticlesRes.errors,
    );
    return;
  }
  const articles = allArticlesRes.data.allArticle.nodes || [];

  const tagsMap = new Map(); // tagId -> articles
  const sourcesMap = new Map(); // sourceName -> articles
  for (const a of articles) {
    if (Array.isArray(a.tags)) {
      a.tags.forEach((t) => {
        if (!tagsMap.has(t)) tagsMap.set(t, []);
        tagsMap.get(t).push(a);
      });
    }
    const s = a?.source?.name;
    if (s) {
      if (!sourcesMap.has(s)) sourcesMap.set(s, []);
      sourcesMap.get(s).push(a);
    }
  }

  // Create Tag detail pages
  tagsMap.forEach((arts, tagId) => {
    const slug = slugify(tagId);
    const pagePath = `/tags/${slug}/`;
    reporter.info(`Creating tag page: ${pagePath}`);
    createPage({
      path: pagePath,
      component: tagTemplate,
      context: {
        tagId,
      },
    });
  });

  // Create Source detail pages
  sourcesMap.forEach((arts, sourceName) => {
    const slug = slugify(sourceName);
    const pagePath = `/sources/${slug}/`;
    reporter.info(`Creating source page: ${pagePath}`);
    createPage({
      path: pagePath,
      component: sourceTemplate,
      context: {
        sourceName,
      },
    });
  });

  // Create index pages
  createPage({
    path: `/tags/`,
    component: tagsIndexTemplate,
    context: {
      tags: Array.from(tagsMap.keys()),
    },
  });

  createPage({
    path: `/sources/`,
    component: sourcesIndexTemplate,
    context: {
      sources: Array.from(sourcesMap.keys()),
    },
  });
};

exports.onCreateNode = ({
  node,
  actions,
  createNodeId,
  createContentDigest,
}) => {
  const { createNode } = actions;

  if (node.internal.type === "TaggedJson" && node.articles) {
    node.articles.forEach((article) => {
      if (isOffTopicArticle(article)) return;
      const nodeId = createNodeId(`article-${article.url}`);
      const nodeContent = JSON.stringify(article);
      const nodeData = {
        ...article,
        id: nodeId,
        parent: node.id,
        internal: {
          type: "Article",
          content: nodeContent,
          contentDigest: createContentDigest(article),
        },
      };
      createNode(nodeData);
    });
  }
};

exports.createSchemaCustomization = ({ actions }) => {
  const { createTypes } = actions;
  const typeDefs = `
    type Source {
      id: String
      name: String
    }

    type Article implements Node{
      source: Source
      author: String
      title: String
      description: String
      url: String
      urlToImage: String
      publishedAt: Date @dateformat
      content: String
      tags: [String]
    }

    type TaggedJson implements Node {
      articles: [Article]
    }
  `;
  createTypes(typeDefs);
};
