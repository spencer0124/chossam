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
- [ ] Cloudflare Pages: build `npm run build`, output `dist`, Node 22
- [x] Notion test rows deleted in the UI (19 rows left; recoverable from 휴지통).
      The sync integration is read-only by design, so this could not be done by API.
- [x] Re-synced: 3 files pruned, 19 posts remain, site no longer shows them

## Left for you

- [ ] Merge to `dev` after the Pages preview looks right
