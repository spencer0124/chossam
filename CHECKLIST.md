# Migration checklist — NotionNext → Astro + Notion sync

Branch `feat/astro-rewrite`. Plan: `~/.claude/plans/fuzzy-coalescing-barto.md`.

## Phase 0 — Setup

- [x] Branch `feat/astro-rewrite` cut from `dev`
- [x] Promo banner + logo extracted from `../assets/홈페이지.pptx`
      (the mockup's caption turned out to be part of the banner image — no separate text node)
- [x] NotionNext torn down (2894 files), favicons/icons and LICENSE kept
- [x] Astro 7 + TypeScript 6 + Vitest 4 scaffold, build green

## Phase 1 — Web design system

- [x] `@skkuverse/tokens` + a subset of `@skkuverse/ui` vendored into `src/sds/`
      from `skkuverse-web@d527d1a` — the **web** React 19 port, not the RN system
- [x] `src/sds/SOURCE.md` records origin commit and the two local changes
- [x] `FONT_FAMILY` → Pretendard stack
- [x] Board tabs are the SDS `Tab`, themed `#B40407` through `SDSProvider`
- [x] Typecheck clean over the vendored tree

## Phase 2 — Sync job (TDD)

- [x] `resolveProperties` — finds title/board/date by **type**, so renaming
      카테고리 does not break the sync (the real keys are `:PGV` / `Ylrt`)
- [x] `toPost` / `slugFor` — row → post record
- [x] `markdown` — image collection, content-hashed asset names, URL rewriting,
      `<empty-block/>` stripping, deterministic file rendering
- [x] `planSync` — writes, prunes, refuses slug collisions
- [x] `scripts/sync-notion.ts` — data-source discovery, pagination,
      `pages.retrieveMarkdown`, `--dry-run` / `--check`
- [x] Notion integration `chossam-site-sync` created read-only and connected
- [x] First real sync: 22 posts, 7 boards, no warnings
- [x] Idempotent: second run writes 0 files

Two bugs the tests caught before they shipped:

- **Slug collision.** Notion page ids are time-ordered, so all 22 rows share the
  prefix `3cdf3b60-7973-…`. A prefix-derived slug collided 22 ways; slugs now come
  from the id's tail. `planSync` still refuses duplicates.
- **YAML dates.** An unquoted `date: 2026-08-11` parses to a `Date` at UTC
  midnight — the timezone shift `src/lib/date.ts` exists to avoid. Frontmatter
  now quotes it.

## Phase 3 — Site

- [x] `src/content.config.ts` — posts collection, zod-validated at build
- [x] `src/lib/boards.ts` — ordered board list, zod-validated
- [x] `BoardBrowser` island — every board's list prerendered, all but one `hidden`
- [x] `/`, `/posts/<slug>`, `/404`
- [x] `src/config/site.ts` — 원희캐슬 A동 601호 / 010-8336-6325
- [x] Banner through `astro:assets` (249 kB PNG → 17–51 kB WebP)

## Phase 4 — CI

- [x] `sync-notion.yml` — hourly + manual, concurrency guard, SHA-pinned actions,
      commits only on change, no `[skip ci]` (the commit *is* the deploy trigger)
- [x] `ci.yml` — typecheck, test, build, and an assertion that `dist/` contains
      no Notion URLs
- [x] Inherited NotionNext workflows removed

## Phase 5 — Verified

- [x] 67 tests green, `tsc` clean, `astro check` 0 errors
- [x] Default tab 공지사항; clicking 중1과정 in a real browser swaps to its 2 posts
      and sets `?board=중1과정`
- [x] All 22 posts in the HTML; 6 of 7 lists hidden
- [x] Post pages render title, date and back-link to their board
- [x] `grep -r "notion\.so\|file\.notion\.com\|amazonaws" dist/` → 0 hits
- [x] No calendar anywhere

## Phase 6 — Paged list with a stable footprint

The board region must not change height when you switch tabs, or the banner
below it jumps.

- [x] Fixed row height (52px) + single-line titles with ellipsis
- [x] `POSTS_PER_PAGE = 5`; the list area reserves that many rows' height
- [x] Pager renders on every board, both buttons disabled on a single-page one
- [x] Switching boards returns to page 1
- [x] `?board=` and `?page=` both round-trip
- [x] Every post stays in the prerendered HTML — paging hides rows, never drops them
- [x] Browser-verified: banner at y=516 on **all 7 tabs** (1 distinct position)
- [x] Browser-verified paging by temporarily setting page size to 2:
      1/3 → 2/3 → 3/3, banner fixed at y=360 even on the 1-row last page

**Bug the browser caught and the unit tests could not.** `hidden` hides through
the user-agent stylesheet, which an inline `display: flex` outranks — so off-page
rows still occupied space and pushed the banner down 104px on 공지사항. Testing
Library ignores `hidden` elements regardless of CSS, so all 77 tests passed on a
visibly broken page. Now covered by three `getComputedStyle` regression tests.

## Phase 7 — Infrastructure

- [x] GitHub secrets `NOTION_TOKEN` / `NOTION_DATABASE_ID` set on
      **spencer0124/chossam**. Note: `gh` defaulted to the *upstream*
      `notionnext-org/NotionNext`, so every command needs `--repo`; the repo
      default is now pinned.
- [x] Committed `ddf4d1fd`, pushed, fast-forwarded feat → dev → main
- [x] CI caught a real gap the local machine hid: `astro:content` types are
      generated into `.astro/types.d.ts` by `astro sync`, which a fresh clone has
      never run. `typecheck` now syncs first (`9c11eab9`).
- [x] Cloudflare Pages: the project did not exist at all — the old DEPLOY.md
      described `chossam.pages.dev` as a plan, not a fact. Created it connected to
      `spencer0124/chossam`: production branch `main`, preset Astro,
      `npm run build` → `dist`, `NODE_VERSION=22`. First build succeeded in ~31s.
- [x] Live at https://chossam.pages.dev — 7 tabs, 19 posts, banner at one fixed
      position across every tab, 0 Notion URLs in the served HTML
- [x] Notion test rows deleted in the UI (19 rows left; recoverable from 휴지통).
      The sync integration is read-only by design, so this could not be done by API.
- [x] Re-synced: 3 files pruned, 19 posts remain, site no longer shows them

## Phase 8 — Icons, sharing card, and a live pipeline test

- [x] Favicon, touch icon and sharing card all generated from the crest by
      `scripts/make-icons.ts` — one source, so they cannot drift from the header
- [x] Open Graph: crest on white 1200×630, title `목동조쌤 영어학원`,
      description `공지사항 및 과정 안내`, plus Twitter card tags
- [x] Verified live: `favicon.ico` 200, `og-image.png` 200, all tags served
- [x] 8 dummy notices added — 공지사항 now holds 13, i.e. 3 pages — including a
      long body (headings/lists/quote/bold), two uploaded images, and a
      deliberately long title
- [x] Rich markdown now styled (lists, quotes, bold, tables, code)
- [x] Manual sync run twice. First: 27 rows, 9 files, 2 images downloaded.
      Second, after a text edit: exactly 2 files — incremental, as designed.
- [x] **Scheduled sync: every hour at :17** (`cron: '17 * * * *'`; cron minutes are
      timezone-independent, so :17 KST)
- [x] Live: pager 1/3 → 2/3 → 3/3, banner fixed at y=516 on every page; both post
      images served from `/_astro/*.webp`; 0 Notion URLs on any page
- [x] 390px: every row exactly 52px, long titles truncate rather than wrap
- [x] 목동조쌤 unspaced everywhere — code, docs, Notion row titles and page bodies

## Done

The site is live and the loop is closed. Add a row in Notion and it appears
within the hour — or immediately via Actions → **Sync Notion content** →
Run workflow. Nothing outstanding.
