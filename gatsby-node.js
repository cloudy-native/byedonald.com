const path = require("path");

exports.createPages = async ({ graphql, actions, reporter }) => {
  const { createPage } = actions;

  const newsDayTemplate = path.resolve("./src/templates/news-day.tsx");

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

      reporter.info(`Creating news page: ${pagePath}`);
      createPage({
        path: pagePath,
        component: newsDayTemplate,
        context: {
          date: date,
          articles: node.articles,
        },
      });
    });
  }
};

exports.onCreateNode = ({ node, actions, createNodeId, createContentDigest }) => {
  const { createNode } = actions;

  if (node.internal.type === 'TaggedJson' && node.articles) {
    node.articles.forEach(article => {
      const nodeId = createNodeId(`article-${article.url}`);
      const nodeContent = JSON.stringify(article);
      const nodeData = {
        ...article,
        id: nodeId,
        parent: node.id,
        internal: {
          type: 'Article',
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
