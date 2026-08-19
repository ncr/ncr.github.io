import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    draft: z.boolean().default(false),
    key: z.string().optional(), // wspólny klucz wersji językowych tego samego wpisu (domyślnie slug)
  }),
})

export const collections = { blog }
