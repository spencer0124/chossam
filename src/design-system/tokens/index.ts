/**
 * Design tokens — the single source of truth for raw values.
 *
 * Vendored from `@skkuverse/shared/src/tokens`. In skkuverse these lived in a
 * separate workspace package; here they are owned by PINDOM directly, so the
 * colour ramp is re-themed to the PINDOM brand rather than kept in sync.
 *
 * Only the public surface is re-exported — internal typography helpers stay
 * private to their module, matching what `@skkuverse/shared` exposed.
 */
export { SdsColors } from './colors';
export { SdsTypo, FONT_FAMILY, type SdsTextStyle } from './typography';
export { SdsSpacing } from './spacing';
export { SdsRadius } from './radius';
export { SdsShadows } from './shadows';
export { SdsDuration, SdsCurves } from './duration';
