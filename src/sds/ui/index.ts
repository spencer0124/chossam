/**
 * SDS (web) — the subset this site uses.
 *
 * Vendored from skkuverse-web `packages/ui`; see ../SOURCE.md for the origin
 * commit and the local changes. Upstream's barrel re-exports every component,
 * which would pull `@phosphor-icons/react` and `lottie-react` into the bundle
 * for components this site never renders. This barrel exports only what is
 * vendored, so an unused dependency cannot arrive by accident.
 */

// ── Providers ──
export { SDSProvider, type SDSProviderProps } from './core/SDSProvider';
export {
  ThemeProvider,
  useTheme,
  defaultSeedToken,
  type ThemeToken,
  type ThemeProviderProps,
  type SeedToken,
} from './core/ThemeProvider';
export { AdaptiveColorProvider, useAdaptive } from './core/AdaptiveColorProvider';
export { TypographyProvider, useTypographyTheme } from './core/TypographyProvider';
export { OverlayProvider, useOverlay } from './core/OverlayProvider';

// ── Components ──
export { Tab, type TabProps, type TabItemProps, type TabAlignment } from './components/tab';
export { ListRow, type ListRowProps } from './components/list-row';

// ── Foundation / helpers ──
export { getAdaptiveColors, colorSeeds, type ColorPreference } from './foundation/colors';
export {
  typographyMap,
  fontWeightMap,
  FONT_FAMILY,
  type TypographyKeys,
} from './foundation/typography';
export { mergeStyles, lineClamp, withAlpha, type Style } from './internal/style';
export { TRANSITION } from './internal/keyframes';
