# Working in this repository

## Merging to `main` publishes the site

Cloudflare Pages builds `main` as production. **A push or merge to `main` is a
deploy** — there is no separate release step and nothing to approve afterwards.
Treat it as the publish action it is: confirm before doing it, the way you would
before any outward-facing change.

- `dev` is the working branch. Commit there by default.
- Publish with `git checkout main && git merge dev && git push origin main`,
  then return to `dev`.
- `feat/*` branches only when explicitly asked for one.

`DEPLOY.md` has the Pages project settings and the Notion sync secrets.

## Verify UI against the build, not the dev server

`astro dev` has pushed **stale HMR style payloads** over correctly-served HTML:
the response carried `max-width: 400px` while the live document still applied
`680px` from an earlier edit, and a reload did not clear it. Measurements taken
from a dev-server tab silently lag the source.

When a visual change has to be confirmed, build and serve the output:

```bash
npm run build && (cd dist && python3 -m http.server 4400)
```

Measure the real layout in the browser rather than trusting the screenshot —
`getBoundingClientRect()` on the element, plus `img.currentSrc` to confirm the
browser picked the srcset candidate you intended.

## The promo banner's width is its type scale

`src/assets/promo-golden-time.png` has its text **baked into the pixels**, so
the rendered font size is `sourceSize x (displayWidth / 1772)`. The smallest
caption glyphs measure 29px in the source, which means:

| display width | caption renders at |
|---|---|
| 400px (current) | ~7px |
| 680px | ~11px, the readability floor |
| 860px | ~14px, but 746px tall — fills a laptop viewport |

The current 400px cap deliberately trades that fine print for a quiet banner;
the `alt` text carries the full message, so screen readers lose nothing.

If the cap changes, **change `sizes` with it** or the browser fetches a
candidate wider than the slot. The slot is `min(min(vw, 900) - 40, cap)`, so
the breakpoint is the viewport width at which the column reaches the cap.

## Before committing

`npm test` (vitest), `npm run check` (astro check), `npm run typecheck`.
CI runs these on `main`, `dev` and `feat/**`.
