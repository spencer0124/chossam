#!/usr/bin/env tsx
/**
 * Pull the notice database out of Notion and commit it as files.
 *
 * This is the only thing in the repository that talks to Notion. Everything it
 * produces — markdown under src/content/posts, the board list, downloaded
 * images — is committed, so a site build never needs a token or a network.
 *
 *   npm run sync              write the files
 *   npm run sync -- --dry-run report what would change, write nothing
 *   npm run sync -- --check   exit 1 if the committed content is out of date
 *
 * Requires NOTION_TOKEN and NOTION_DATABASE_ID (a .env file is loaded if present).
 */
import { Client, isNotionClientError } from '@notionhq/client'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ASSETS_DIR,
  BOARDS_FILE,
  POSTS_DIR,
  planSync,
  type FileWrite,
  type SyncEntry
} from '../src/lib/notion/plan.ts'
import {
  assetFileName,
  collectImageUrls,
  findUnknownBlocks,
  rewriteImageUrls,
  stripNotionArtifacts
} from '../src/lib/notion/markdown.ts'
import { toPost } from '../src/lib/notion/post.ts'
import { resolveProperties, type Schema } from '../src/lib/notion/properties.ts'

/** The API version that introduced data sources. Pinned: it is a breaking axis. */
const NOTION_VERSION = '2025-09-03'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

type Mode = 'write' | 'dry-run' | 'check'

const warnings: string[] = []
const warn = (message: string) => {
  warnings.push(message)
  console.warn(`  ! ${message}`)
}

function parseMode(argv: string[]): Mode {
  if (argv.includes('--check')) return 'check'
  if (argv.includes('--dry-run')) return 'dry-run'
  return 'write'
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(
      `${name} is not set. Locally: put it in .env. In CI: add it under ` +
        `Settings → Secrets and variables → Actions.`
    )
  }
  return value
}

/** Every row in the data source, following the cursor to the end. */
async function queryAllRows(client: Client, dataSourceId: string) {
  const rows: Array<{ id: string; properties?: Record<string, unknown> }> = []
  let cursor: string | undefined

  do {
    const page = await client.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100
    })
    rows.push(...(page.results as typeof rows))
    cursor = page.has_more ? (page.next_cursor ?? undefined) : undefined
  } while (cursor)

  return rows
}

/**
 * Resolve the data source behind a database.
 *
 * Since API version 2025-09-03 a database is a container: its rows and schema
 * live in a data source, and passing a database id to a data source endpoint is
 * an error rather than a fallback.
 */
async function resolveDataSourceId(client: Client, databaseId: string): Promise<string> {
  const database = await client.databases.retrieve({ database_id: databaseId })

  // The response is a union: a database the integration can only see partially
  // carries no schema and no data sources, which is the shape a missing
  // connection produces.
  if (!('data_sources' in database)) {
    throw new Error(
      `Database ${databaseId} came back without its data sources. The integration is ` +
        `probably not connected to it: open the database in Notion → \u22ef → Connections.`
    )
  }
  const sources = database.data_sources

  if (sources.length === 0) {
    throw new Error(`Database ${databaseId} exposes no data sources.`)
  }
  if (sources.length > 1) {
    warn(
      `Database has ${sources.length} data sources (${sources.map(source => source.name).join(', ')}); ` +
        `syncing the first.`
    )
  }
  return sources[0]!.id
}

/** Files currently in a directory, or none if it does not exist yet. */
async function listDir(relative: string): Promise<string[]> {
  try {
    const names = await readdir(join(ROOT, relative))
    return names.filter(name => !name.startsWith('.')).sort()
  } catch {
    return []
  }
}

interface DownloadedImage {
  file: string
  bytes: Uint8Array
}

/** Fetch one image and name it after its bytes. */
async function download(url: string): Promise<DownloadedImage | null> {
  const response = await fetch(url)
  if (!response.ok) {
    warn(`image download failed (${response.status}) — leaving the remote url: ${url.slice(0, 80)}`)
    return null
  }
  const bytes = new Uint8Array(await response.arrayBuffer())
  return {
    file: assetFileName(bytes, url, response.headers.get('content-type') ?? undefined),
    bytes
  }
}

/**
 * Fetch one post's body, pulling its images into the repository.
 *
 * Notion signs file URLs for about an hour, so a body that still pointed at
 * them would render broken images shortly after the build.
 */
async function fetchBody(
  client: Client,
  pageId: string,
  title: string,
  assets: Map<string, Uint8Array>
): Promise<string> {
  const page = await client.pages.retrieveMarkdown({ page_id: pageId })

  if (page.truncated) {
    warn(`"${title}" was truncated by Notion — the page is very large.`)
  }
  if (page.unknown_block_ids.length > 0) {
    const types = findUnknownBlocks(page.markdown)
    warn(
      `"${title}" contains ${page.unknown_block_ids.length} block(s) Notion cannot render as ` +
        `markdown${types.length ? ` (${[...new Set(types)].join(', ')})` : ''}; ` +
        `they appear as <unknown> in the body.`
    )
  }

  const downloaded = new Map<string, string>()
  for (const url of collectImageUrls(page.markdown)) {
    const image = await download(url)
    if (!image) continue
    downloaded.set(url, image.file)
    assets.set(image.file, image.bytes)
  }

  return stripNotionArtifacts(rewriteImageUrls(page.markdown, downloaded))
}

/** True when the file on disk already holds exactly this content. */
async function isUnchanged(write: FileWrite): Promise<boolean> {
  try {
    return (await readFile(join(ROOT, write.path), 'utf8')) === write.content
  } catch {
    return false
  }
}

async function main(): Promise<number> {
  const mode = parseMode(process.argv.slice(2))
  try {
    process.loadEnvFile(join(ROOT, '.env'))
  } catch {
    // No .env locally is normal; CI passes the secrets as environment variables.
  }

  const client = new Client({ auth: requireEnv('NOTION_TOKEN'), notionVersion: NOTION_VERSION })
  const databaseId = requireEnv('NOTION_DATABASE_ID')

  console.log(`Notion sync (${mode})`)

  const dataSourceId = await resolveDataSourceId(client, databaseId)
  const dataSource = await client.dataSources.retrieve({ data_source_id: dataSourceId })
  const names = resolveProperties(dataSource.properties as unknown as Schema)
  console.log(
    `  schema: title="${names.title}" board="${names.board}" date="${names.date}"\n` +
      `  boards: ${names.boardOptions.join(', ')}`
  )

  const rows = await queryAllRows(client, dataSourceId)
  const posts = rows.map(row => toPost(row, names, { warn })).filter(post => post !== null)
  console.log(`  rows: ${rows.length} → posts: ${posts.length}`)

  const assets = new Map<string, Uint8Array>()
  const entries: SyncEntry[] = []
  for (const post of posts) {
    entries.push({ post, body: await fetchBody(client, post.notionId, post.title, assets) })
  }

  const plan = planSync({
    entries,
    boards: names.boardOptions,
    existingPosts: await listDir(POSTS_DIR),
    existingAssets: await listDir(ASSETS_DIR),
    usedAssets: [...assets.keys()]
  })

  const changedFiles: string[] = []
  for (const write of plan.writes) {
    if (!(await isUnchanged(write))) changedFiles.push(write.path)
  }
  const existingAssets = new Set(await listDir(ASSETS_DIR))
  const newAssets = [...assets.keys()].filter(file => !existingAssets.has(file))

  const changeCount = changedFiles.length + newAssets.length + plan.deletes.length
  for (const path of changedFiles) console.log(`  ~ ${path}`)
  for (const file of newAssets) console.log(`  + ${ASSETS_DIR}/${file}`)
  for (const path of plan.deletes) console.log(`  - ${path}`)

  if (mode === 'check') {
    if (changeCount === 0) {
      console.log('  up to date')
      return 0
    }
    console.error(`\n${changeCount} file(s) differ from Notion. Run: npm run sync`)
    return 1
  }

  if (mode === 'dry-run') {
    console.log(`\n${changeCount} file(s) would change. Nothing was written.`)
    return 0
  }

  await mkdir(join(ROOT, POSTS_DIR), { recursive: true })
  await mkdir(join(ROOT, ASSETS_DIR), { recursive: true })
  await mkdir(join(ROOT, dirname(BOARDS_FILE)), { recursive: true })

  for (const write of plan.writes) {
    if (changedFiles.includes(write.path)) {
      await writeFile(join(ROOT, write.path), write.content, 'utf8')
    }
  }
  for (const file of newAssets) {
    await writeFile(join(ROOT, ASSETS_DIR, file), assets.get(file)!)
  }
  for (const path of plan.deletes) {
    await rm(join(ROOT, path), { force: true })
  }

  console.log(`\n${changeCount} file(s) changed.`)
  if (warnings.length > 0) console.log(`${warnings.length} warning(s) above.`)
  return 0
}

main()
  .then(code => process.exit(code))
  .catch((error: unknown) => {
    if (isNotionClientError(error)) {
      console.error(`\nNotion API error (${error.code}): ${error.message}`)
      if (error.code === 'object_not_found') {
        console.error(
          'The integration cannot see this database. In Notion open the database → ⋯ → ' +
            'Connections → add your integration.'
        )
      }
    } else {
      console.error(`\n${error instanceof Error ? error.message : String(error)}`)
    }
    process.exit(1)
  })
