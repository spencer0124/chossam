# 목동조쌤 영어학원

The academy's website: a board of notices and the programme banner.

## How it works

Notion is the source of truth for **posts only**. A scheduled GitHub Action pulls
the notice database and commits it as ordinary files; the site is a static Astro
build that reads those files and never talks to Notion.

```
Notion notice database
   │  .github/workflows/sync-notion.yml — hourly, or run it by hand
   ▼
scripts/sync-notion.ts — fetch → transform → validate → write
   │
   ├── src/content/posts/<id>.md      one file per notice
   ├── src/data/boards.json           board names, in tab order
   └── src/assets/notion/<hash>.png   images lifted out of post bodies
   │
   ▼
astro build → dist/ → Cloudflare Pages
```

Everything that is not a notice — the logo, the banner, the address and phone
number — lives in this repository: see `src/config/site.ts`.

Two properties this design buys, both worth preserving:

- **Builds are hermetic.** No token, no network, no Notion outage can break a
  deploy. `npm ci && npm run build` from a fresh clone produces the live site.
- **Content changes are diffs.** Every sync is a reviewable commit, and
  `git revert` is the rollback.

## Commands

| | |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | static build into `dist/` |
| `npm run preview` | serve the build |
| `npm test` | unit and component tests |
| `npm run typecheck` | TypeScript |
| `npm run sync` | pull from Notion and write the content files |
| `npm run sync -- --dry-run` | report what would change, write nothing |
| `npm run sync -- --check` | exit non-zero if the committed content is stale |

## Syncing locally

Put the credentials in `.env` (gitignored):

```
NOTION_TOKEN=ntn_…
NOTION_DATABASE_ID=…
```

The token belongs to the `chossam-site-sync` internal integration, which has
**read content** permission only and is connected to the notice database. The
same two values are repository secrets, used by the workflow.

## Adding a notice

Add a row in the Notion database with a title, a 카테고리 (which board it appears
under) and a 날짜. It goes live within the hour, or immediately if you run the
**Sync Notion content** workflow from the Actions tab.

Boards come from the 카테고리 property's options, **in the order Notion lists
them** — reorder the options and the tabs reorder with them. The property names
are not hardcoded: the sync finds the title, board and date columns by type, so
renaming 카테고리 in Korean does not break the build.

## Design system

`src/sds` is a vendored copy of the web SKKU Design System. `src/sds/SOURCE.md`
records where it came from and the two local changes. The board tab strip is its
`Tab` component, themed to the academy's logo red.
