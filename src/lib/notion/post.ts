/**
 * Turning a Notion row into the post record the site stores.
 *
 * Everything Notion-shaped stops here: past this function a post is four
 * strings, and nothing downstream knows what a rich-text run or a multi_select
 * is.
 */

export interface Post {
  /** Full Notion page id — the join key back to the source row. */
  notionId: string
  /** URL segment. Derived from the id, so a retitled post keeps its link. */
  slug: string
  title: string
  board: string
  /** `YYYY-MM-DD`, or null when the editor left the date empty. */
  date: string | null
}

export interface ResolvedNames {
  title: string
  board: string
  date: string
}

export interface ToPostOptions {
  warn?: (message: string) => void
}

interface RichTextRun {
  plain_text?: string
}

interface NotionRow {
  id: string
  properties?: Record<string, unknown>
}

/**
 * The eight trailing hex characters of the page id.
 *
 * Derived from the id rather than the title, so fixing a typo in a headline
 * does not break every existing link.
 *
 * The *trailing* characters specifically: Notion page ids are time-ordered, so
 * rows created in the same database share a long leading run — the first sync
 * of this site produced a 22-way collision on a prefix-derived slug. The tail
 * carries the random bits. `planSync` still refuses a duplicate rather than
 * letting one notice overwrite another.
 */
export function slugFor(notionId: string): string {
  return notionId.replace(/-/g, '').slice(-8)
}

function readTitle(property: unknown): string {
  const runs = (property as { title?: RichTextRun[] } | undefined)?.title
  if (!Array.isArray(runs)) return ''
  // Notion splits a title at every style change; the reader sees one sentence.
  return runs.map(run => run.plain_text ?? '').join('').trim()
}

function readBoards(property: unknown): string[] {
  const value = property as
    | { multi_select?: Array<{ name?: string }>; select?: { name?: string } }
    | undefined

  if (Array.isArray(value?.multi_select)) {
    return value.multi_select.map(option => option.name ?? '').filter(Boolean)
  }
  if (value?.select?.name) return [value.select.name]
  return []
}

/** Notion dates arrive as `YYYY-MM-DD` or a full ISO timestamp; keep the day. */
function readDate(property: unknown): string | null {
  const start = (property as { date?: { start?: string } | null } | undefined)?.date?.start
  if (!start) return null
  return start.slice(0, 10)
}

/**
 * Map one row. Returns null for a row that cannot be rendered — no title, or no
 * board and therefore no tab to appear under. Skipping is deliberate: a draft
 * row half-filled in Notion should not become an untitled page on the site.
 */
export function toPost(
  row: NotionRow,
  names: ResolvedNames,
  options: ToPostOptions = {}
): Post | null {
  const properties = row.properties ?? {}

  const title = readTitle(properties[names.title])
  if (!title) return null

  const boards = readBoards(properties[names.board])
  if (boards.length === 0) return null
  if (boards.length > 1) {
    options.warn?.(
      `"${title}" lists ${boards.length} boards (${boards.join(', ')}); ` +
        `using ${boards[0]} and ignoring the rest.`
    )
  }

  return {
    notionId: row.id,
    slug: slugFor(row.id),
    title,
    board: boards[0] as string,
    date: readDate(properties[names.date])
  }
}
