# Vendored design system

`src/sds` is a copy of the **web** SKKU Design System, not the React Native one.

| | |
|---|---|
| Source repo | `spencer0124/skkuverse-web` |
| Commit | `d527d1a0101dc632b9b49b2328ecde5fa744fba5` |
| Copied | `packages/tokens/src` → `src/sds/tokens`, a subset of `packages/ui/src` → `src/sds/ui` |
| Vendored on | 2026-08-31 |

## Why vendored rather than depended on

`@skkuverse/ui` and `@skkuverse/tokens` are private pnpm workspace packages inside a
monorepo. npm cannot install a subdirectory of a git repository, and neither package is
published, so a copy with a recorded provenance is the honest option. Re-sync by copying the
same paths from a newer commit and re-applying the local changes below.

## What was copied

Only what the board browser renders, plus what those files transitively import:

```
tokens/                       all of packages/tokens/src
ui/core/                      AdaptiveColorProvider, ThemeProvider, TypographyProvider,
                              SDSProvider, OverlayProvider
ui/foundation/                colors, typography
ui/internal/                  style, keyframes
ui/utils/                     useControlled, mergeRefs
ui/components/tab             the board selector
ui/components/list-row        post rows
```

Upstream's `ui/src/index.ts` re-exports every component, several of which import
`@phosphor-icons/react` or `lottie-react`. Neither package is installed here, so
`ui/index.ts` was rewritten to export only the vendored subset.

## Local changes

1. **`ui/foundation/typography.ts` — `FONT_FAMILY`.** Upstream ships `WantedSans`.
   This site uses Pretendard (loaded as a dynamic subset in `src/styles/global.css`), so the
   constant is a full CSS font stack ending in `system-ui`.
2. **`ui/index.ts`** — rewritten as described above.

Every other file is byte-identical to upstream. `@skkuverse/tokens` imports inside the
vendored `ui` tree resolve through the `paths` alias in `tsconfig.json`, so those files did
not need editing.

## Theming

Components read the accent from `ThemeProvider`. The academy's logo red is applied once, at
the island root:

```tsx
<SDSProvider token={{ color: { primary: '#B40407' } }}>
```
