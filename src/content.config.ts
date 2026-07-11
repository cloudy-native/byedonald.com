import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const newsCollection = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './data/news/tagged' }),
  schema: z.object({
    status: z.string().optional(),
    totalResults: z.number().optional(),
    articles: z.array(z.object({
      source: z.object({
        id: z.string().nullable(),
        name: z.string(),
      }),
      author: z.string().nullable(),
      title: z.string(),
      description: z.string().nullable(),
      url: z.string(),
      urlToImage: z.string().nullable(),
      publishedAt: z.string(),
      content: z.string().nullable(),
      tags: z.array(z.string()),
      publishedAtTs: z.number(),
    })),
  }),
});

export const collections = { news: newsCollection };
