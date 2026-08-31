/**
 * Markdown handling for synced posts.
 *
 * Two jobs: get Notion's presigned image URLs out of the document before they
 * expire, and render a file whose bytes depend only on the content — so a sync
 * that changed nothing produces no diff.
 */
import { createHash } from 'node:crypto'
import type { Post } from './post'

/** Where downloaded images live, relative to a file in src/content/posts. */
export const ASSET_DIR = 'src/assets/notion'
const ASSET_REF_PREFIX = '../../assets/notion'

const MARKDOWN_IMAGE = /!\[[^\]]*\]\(\s*(<[^>]+>|[^)\s]+)/g
const HTML_IMAGE = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi
const UNKNOWN_BLOCK = /<unknown\b[^>]*?\btype\s*=\s*["']([^"']+)["']/gi

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/avif': '.avif'
}

const KNOWN_EXTENSIONS = new Set(Object.values(EXTENSION_BY_MIME))

function unwrap(target: string): string {
  return target.startsWith('<') && target.endsWith('>') ? target.slice(1, -1) : target
}

/** Every distinct image URL in the document, in first-seen order. */
export function collectImageUrls(markdown: string): string[] {
  const found = new Set<string>()

  for (const match of markdown.matchAll(MARKDOWN_IMAGE)) {
    const url = unwrap(match[1] ?? '')
    if (url) found.add(url)
  }
  for (const match of markdown.matchAll(HTML_IMAGE)) {
    const url = match[1]
    if (url) found.add(url)
  }

  return [...found]
}

function extensionFor(url: string, contentType?: string): string {
  const fromMime = contentType && EXTENSION_BY_MIME[contentType.split(';')[0]?.trim() ?? '']

  let pathname = url
  try {
    pathname = new URL(url).pathname
  } catch {
    pathname = url.split('?')[0] ?? url
  }

  const dot = pathname.lastIndexOf('.')
  const fromPath = dot === -1 ? '' : pathname.slice(dot).toLowerCase()

  if (KNOWN_EXTENSIONS.has(fromPath)) return fromPath
  if (fromMime) return fromMime
  return '.png'
}

/**
 * Name a downloaded image after a hash of its bytes.
 *
 * Notion re-signs its file URLs on every read, so a URL-derived name would
 * change on every sync even when the picture did not. Hashing the content makes
 * the write idempotent, which is what lets the workflow commit only on a real
 * change.
 */
export function assetFileName(
  bytes: Uint8Array,
  url: string,
  contentType?: string
): string {
  const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 12)
  return `${digest}${extensionFor(url, contentType)}`
}

/** Point every downloaded image at its local file; leave the rest untouched. */
export function rewriteImageUrls(markdown: string, downloaded: Map<string, string>): string {
  if (downloaded.size === 0) return markdown

  const localFor = (url: string): string | null => {
    const file = downloaded.get(unwrap(url))
    return file ? `${ASSET_REF_PREFIX}/${file}` : null
  }

  return markdown
    .replace(MARKDOWN_IMAGE, (whole, target: string) => {
      const local = localFor(target)
      return local ? whole.replace(target, local) : whole
    })
    .replace(HTML_IMAGE, (whole, target: string) => {
      const local = localFor(target)
      return local ? whole.replace(target, local) : whole
    })
}

/**
 * Remove markers that are Notion's internal bookkeeping, not content.
 *
 * An empty paragraph comes back as a literal `<empty-block/>` tag, which would
 * render as visible markup. Dropping the line and collapsing the blank run it
 * leaves keeps the body reading the way it does in Notion.
 */
export function stripNotionArtifacts(markdown: string): string {
  if (!markdown.includes('<empty-block')) return markdown

  return markdown
    .replace(/^[ \t]*<empty-block\s*\/?>[ \t]*\n?/gm, '')
    .replace(/\n{3,}/g, '\n\n')
}

/**
 * Block types Notion's markdown renderer could not express.
 *
 * They arrive as literal `<unknown type="…">` tags, so without this the post
 * ships with a visible hole and nobody finds out from the diff.
 */
export function findUnknownBlocks(markdown: string): string[] {
  return [...markdown.matchAll(UNKNOWN_BLOCK)].map(match => match[1] ?? '').filter(Boolean)
}

/** Quote a value for YAML: always double-quoted, backslash and quote escaped. */
function yamlString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * Render the file for one post.
 *
 * Fixed key order, LF endings, exactly one trailing newline. Every rule here
 * exists so that two syncs of unchanged content produce byte-identical files.
 */
export function renderMarkdownFile(post: Post, body: string): string {
  const frontmatter = [
    '---',
    `title: ${yamlString(post.title)}`,
    `board: ${yamlString(post.board)}`,
    `date: ${post.date ? yamlString(post.date) : 'null'}`,
    `notionId: ${yamlString(post.notionId)}`,
    '---'
  ].join('\n')

  const normalized = body.replace(/\r\n/g, '\n').replace(/\s+$/, '')

  return `${frontmatter}\n\n${normalized}\n`
}
