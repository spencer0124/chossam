import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

/**
 * Posts are files, written by scripts/sync-notion.ts.
 *
 * The schema is the second gate: the sync validates before it writes, and this
 * fails the build if a file ever lands malformed anyway. `date` is nullable
 * because a notice with no date is an editor oversight worth showing, not a
 * reason to fail a deploy.
 */
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string().min(1),
    board: z.string().min(1),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')
      .nullable(),
    notionId: z.string().min(1)
  })
})

export const collections = { posts }
