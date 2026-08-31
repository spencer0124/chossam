#!/usr/bin/env tsx
/**
 * Generate the favicon, the touch icon and the sharing card from the crest.
 *
 *   npm run icons
 *
 * The single source is `src/assets/logo.png`, the same file the site header
 * renders — so the tab icon, the phone home-screen icon and the link preview
 * can never drift from what a visitor sees at the top of the page.
 *
 * Committed outputs, not build-time ones: `public/` is served verbatim, and a
 * favicon that only existed after a build would be missing from a fresh clone.
 * Re-run this after replacing the logo.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pngToIco from 'png-to-ico'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(ROOT, 'src/assets/logo.png')
const PUBLIC = join(ROOT, 'public')

/** White, not transparent: iOS and most link-preview surfaces composite onto it badly. */
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }

/**
 * The crest with its surrounding whitespace removed.
 *
 * The source has a wide transparent margin, which at 32px would shrink the
 * artwork to a smudge. Trimming first and padding back by a known amount makes
 * the icon read at tab size.
 */
async function crest(): Promise<Buffer> {
  return sharp(SOURCE).trim({ threshold: 10 }).png().toBuffer()
}

/** Square icon: the crest centred on white with a small margin. */
async function squareIcon(size: number): Promise<Buffer> {
  const inner = Math.round(size * 0.86)
  const art = await sharp(await crest())
    .resize(inner, inner, { fit: 'contain', background: { ...WHITE, alpha: 0 } })
    .toBuffer()

  return sharp({
    create: { width: size, height: size, channels: 4, background: WHITE }
  })
    .composite([{ input: art, gravity: 'centre' }])
    .png()
    .toBuffer()
}

/**
 * The Open Graph card: the crest on white at 1200×630.
 *
 * Deliberately just the mark. A card with baked-in text goes stale the moment
 * the wording changes, and the title and description travel as their own tags.
 */
async function openGraphCard(): Promise<Buffer> {
  const art = await sharp(await crest())
    .resize(360, 360, { fit: 'contain', background: { ...WHITE, alpha: 0 } })
    .toBuffer()

  return sharp({
    create: { width: 1200, height: 630, channels: 4, background: WHITE }
  })
    .composite([{ input: art, gravity: 'centre' }])
    .png()
    .toBuffer()
}

async function main() {
  await mkdir(PUBLIC, { recursive: true })

  const favicon = await squareIcon(32)
  await writeFile(join(PUBLIC, 'favicon.png'), favicon)

  // A real multi-resolution .ico: browsers and crawlers still probe /favicon.ico
  // at the root regardless of what the document declares.
  const ico = await pngToIco([
    await squareIcon(16),
    favicon,
    await squareIcon(48)
  ])
  await writeFile(join(PUBLIC, 'favicon.ico'), ico)

  await writeFile(join(PUBLIC, 'apple-touch-icon.png'), await squareIcon(180))
  await writeFile(join(PUBLIC, 'og-image.png'), await openGraphCard())

  console.log('Wrote favicon.ico, favicon.png, apple-touch-icon.png, og-image.png')
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
