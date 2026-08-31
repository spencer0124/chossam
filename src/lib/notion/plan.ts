/**
 * Deciding what the sync writes and deletes.
 *
 * Kept separate from the I/O so it can be tested without a Notion token or a
 * filesystem, and so `--dry-run` reports exactly what a real run would do:
 * both call this and only differ in whether they act on the result.
 */
import { renderMarkdownFile } from './markdown'
import type { Post } from './post'

export const POSTS_DIR = 'src/content/posts'
export const ASSETS_DIR = 'src/assets/notion'
export const BOARDS_FILE = 'src/data/boards.json'

export interface SyncEntry {
  post: Post
  /** Post body, images already rewritten to local paths. */
  body: string
}

export interface PlanInput {
  entries: SyncEntry[]
  /** Board names in Notion's option order — this becomes the tab order. */
  boards: string[]
  /** Markdown filenames currently in POSTS_DIR, e.g. `aaaaaaaa.md`. */
  existingPosts: string[]
  /** Asset filenames currently in ASSETS_DIR. */
  existingAssets: string[]
  /** Asset filenames referenced by the posts in this sync. */
  usedAssets: string[]
}

export interface FileWrite {
  path: string
  content: string
}

export interface SyncPlan {
  writes: FileWrite[]
  deletes: string[]
  warnings: string[]
}

/**
 * Compute the full desired state, then diff it against what is on disk.
 *
 * Throws on a slug collision rather than letting one notice silently overwrite
 * another — the file name is derived from the page id, so a collision means two
 * different posts, not a duplicate.
 */
export function planSync(input: PlanInput): SyncPlan {
  const { entries, boards, existingPosts, existingAssets, usedAssets } = input

  const warnings: string[] = []
  const writes: FileWrite[] = []
  const seen = new Map<string, string>()
  const knownBoards = new Set(boards)

  for (const { post, body } of entries) {
    const previous = seen.get(post.slug)
    if (previous) {
      throw new Error(
        `Slug collision on "${post.slug}": "${previous}" and "${post.title}" would write the ` +
          `same file. Widen the slug in slugFor() to resolve.`
      )
    }
    seen.set(post.slug, post.title)

    if (!knownBoards.has(post.board)) {
      warnings.push(
        `"${post.title}" is filed under "${post.board}", which is not one of the board ` +
          `options (${boards.join(', ')}); it will have no tab to appear under.`
      )
    }

    writes.push({
      path: `${POSTS_DIR}/${post.slug}.md`,
      content: renderMarkdownFile(post, body)
    })
  }

  writes.push({
    path: BOARDS_FILE,
    content: `${JSON.stringify(boards.map(name => ({ name })), null, 2)}\n`
  })

  const wantedPosts = new Set(entries.map(entry => `${entry.post.slug}.md`))
  const wantedAssets = new Set(usedAssets)

  const deletes = [
    ...existingPosts.filter(file => !wantedPosts.has(file)).map(file => `${POSTS_DIR}/${file}`),
    ...existingAssets.filter(file => !wantedAssets.has(file)).map(file => `${ASSETS_DIR}/${file}`)
  ].sort()

  // Sorting makes the plan itself deterministic, so --dry-run output and the
  // order of writes do not depend on how Notion happened to page the results.
  writes.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))

  return { writes, deletes, warnings }
}
