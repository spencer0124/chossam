// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'

/**
 * Static output, no adapter: Cloudflare Pages serves `dist/` directly.
 *
 * Nothing here talks to Notion. Post content arrives as committed files under
 * `src/content/posts` (written by `scripts/sync-notion.ts`), so a build is
 * reproducible from the repository alone.
 */
export default defineConfig({
  site: 'https://chossam.pages.dev',
  output: 'static',
  integrations: [react()],
  build: {
    // One CSS file rather than per-page chunks: this site has three routes.
    inlineStylesheets: 'auto'
  }
})
