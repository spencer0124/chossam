/**
 * SDS Typography Foundation — bridges SdsTypo to the TDS typography key system.
 *
 * TDS uses string keys like 't1', 't2', ... 't7' + sub-types 'st1'–'st13'.
 * SDS maps these to the existing SdsTypo tokens.
 */
// SdsTypo tokens are referenced in comments only — see mappings below.
import { Platform } from 'react-native';
import { FONT_FAMILY } from '@/design-system/tokens';

// ── Font Weight Map (TDS-compatible) ──

export const fontWeightMap = {
  thin: '100',
  extraLight: '200',
  light: '300',
  normal: '400',
  regular: '400',
  medium: '500',
  semiBold: '600',
  semibold: '600',
  bold: '700',
  extraBold: '800',
  heavy: '900',
  black: '900',
} as const;

export type FontWeightKeys = keyof typeof fontWeightMap;
export type FontWeight = (typeof fontWeightMap)[FontWeightKeys];

// ── Typography Keys (TDS-compatible) ──
// TDS has 20 levels: t1, st1, st2, st3, t2, st4, st5, st6, t3, st7,
//                     t4, st8, st9, t5, st10, t6, st11, t7, st12, st13
// SDS maps to the closest existing token.

export type TypographyKeys =
  | 't1'
  | 't2'
  | 't3'
  | 't4'
  | 't5'
  | 't6'
  | 't7'
  | 'st1'
  | 'st2'
  | 'st3'
  | 'st4'
  | 'st5'
  | 'st6'
  | 'st7'
  | 'st8'
  | 'st9'
  | 'st10'
  | 'st11'
  | 'st12'
  | 'st13';

export interface TypographyStyle {
  fontSize: number;
  lineHeight: number;
}

/**
 * TDS typography → fontSize/lineHeight map.
 * Values from @toss/tds-typography fixed sizes.
 */
export const typographyMap: Record<TypographyKeys, TypographyStyle> = {
  // ── Main levels (mapped from SdsTypo) ──
  t1: { fontSize: 30, lineHeight: 40 }, // SdsTypo.t1 — hero
  t2: { fontSize: 26, lineHeight: 35 }, // SdsTypo.t2 — large heading
  t3: { fontSize: 22, lineHeight: 31 }, // SdsTypo.t3 — screen title
  t4: { fontSize: 20, lineHeight: 29 }, // SdsTypo.t4 — section header
  t5: { fontSize: 17, lineHeight: 25.5 }, // SdsTypo.t5 — body (default)
  t6: { fontSize: 15, lineHeight: 22.5 }, // SdsTypo.t6 — small body
  t7: { fontSize: 13, lineHeight: 19.5 }, // SdsTypo.t7 — caption

  // ── Sub levels (TDS intermediate sizes) ──
  st1: { fontSize: 28, lineHeight: 38 }, // between t1 and t2
  st2: { fontSize: 27, lineHeight: 37 },
  st3: { fontSize: 26, lineHeight: 35 }, // = t2
  st4: { fontSize: 24, lineHeight: 33 }, // = SdsTypo.sub5
  st5: { fontSize: 23, lineHeight: 32 },
  st6: { fontSize: 22, lineHeight: 31 }, // = t3
  st7: { fontSize: 21, lineHeight: 30 },
  st8: { fontSize: 19, lineHeight: 28 }, // = SdsTypo.sub8
  st9: { fontSize: 18, lineHeight: 27 },
  st10: { fontSize: 16, lineHeight: 24 }, // = SdsTypo.sub10
  st11: { fontSize: 14, lineHeight: 21 },
  st12: { fontSize: 12, lineHeight: 18 }, // = SdsTypo.sub12
  st13: { fontSize: 11, lineHeight: 16.5 }, // = SdsTypo.sub13
};

// `FONT_FAMILY` is defined in the token layer and imported above for the maps
// below. It is deliberately **not** re-exported: `@/design-system` re-exports
// both `./tokens` and `./foundation` with `export *`, so a pass-through here
// puts the same name on the barrel twice and `import/export` fails the lint.
// Import it from `@/design-system` or `../../tokens`.

/**
 * Font family per weight.
 *
 * This map exists because Wanted Sans does not package its weights the way a single
 * family would. `Wanted Sans Medium` is its **own family**, not a 500 weight inside
 * `Wanted Sans`, so on iOS — where resolution goes through the embedded family name —
 * asking for `Wanted Sans` at weight 500 finds no Medium face and silently renders
 * Regular.
 *
 * On Android this does not arise: `app.config.ts` registers one `WantedSans` family with
 * all three weights, so the numeric `fontWeight` selects the face.
 *
 * Weights with no bundled face (thin, light, extraBold, black) fall to the base family and
 * are synthesised or snapped to the nearest available face. Only 400, 500 and 700 ship.
 */
const MEDIUM_FAMILY = Platform.select({
  ios: 'Wanted Sans Medium',
  default: FONT_FAMILY,
});

export const fontFamilyByWeight: Record<FontWeightKeys, string> = {
  thin: FONT_FAMILY,
  extraLight: FONT_FAMILY,
  light: FONT_FAMILY,
  normal: FONT_FAMILY,
  regular: FONT_FAMILY,
  medium: MEDIUM_FAMILY,
  semiBold: FONT_FAMILY,
  semibold: FONT_FAMILY,
  bold: FONT_FAMILY,
  extraBold: FONT_FAMILY,
  heavy: FONT_FAMILY,
  black: FONT_FAMILY,
};
