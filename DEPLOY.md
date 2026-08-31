# Deploying

Cloudflare Pages, building from this repository.

## Pages project settings

| Setting | Value |
|---|---|
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 22 (`NODE_VERSION=22` if the preset does not set it) |

No environment variables are needed for the build. The Notion credentials belong
to the sync workflow, not to Pages — the build reads committed files only.

## Repository secrets

Under **Settings → Secrets and variables → Actions**:

| Secret | What it is |
|---|---|
| `NOTION_TOKEN` | `chossam-site-sync` internal integration token, read-only |
| `NOTION_DATABASE_ID` | the notice database id |

If the token is ever rotated, replace the secret and run the **Sync Notion
content** workflow once to confirm.

## How content reaches production

The hourly sync commits to this branch; Pages builds that commit. To publish
immediately, run the workflow by hand from the Actions tab.

If a sync ever publishes something wrong, `git revert` the content commit — the
notices are files, so the previous state is exactly recoverable.

## Cutover from the old NotionNext site

The previous stack still exists on the `dev` branch. Before pointing the domain
at this one:

1. Let the Pages preview build for `feat/astro-rewrite` finish and open it.
2. Check that every board tab lists the right notices and the banner renders.
3. Confirm the build output contains no `file.notion.com` URLs — CI asserts this,
   but it is the failure that would only show up an hour later, so it is worth
   a second look.
4. Merge to `dev`, then update the Pages project's build command and output
   directory to the values above (the old stack used a different pair).

## Custom domain

Add it under the Pages project → Custom domains, then set `site` in
`astro.config.mjs` and `site.url` in `src/config/site.ts` to the same origin.
Both feed canonical URLs and Open Graph tags, so a stale value there means wrong
link previews rather than a broken page — easy to miss.
