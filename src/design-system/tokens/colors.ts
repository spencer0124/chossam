/**
 * PINDOM Color Tokens.
 *
 * Structure is inherited from TDS (Toss Design System) via SDS. Use these tokens
 * instead of hardcoded hex values.
 *
 * The live palette is the `2b` group at the bottom, sampled from
 * `design/2026-08-20-prototype.html` — 인쇄물, 블랙 & 애시드. It is a single dark
 * ground with one accent, and secondary tone comes from a **white-alpha ladder**
 * rather than a grey scale, which is why the TDS greys below have nothing to
 * contribute to a PINDOM screen.
 *
 * The `brand` violet ramp and the TDS grey ladder are **superseded**
 * (ADR 0006). They are kept because components still reference them directly and
 * removing them would be a 22-file change with no design review behind it; the
 * dark surface map in `foundation/colors.ts` is what actually reaches a screen.
 */
export const SdsColors = {
  // ── Grey Scale (TDS, blue-tinted — see KNOWN GAP above) ──
  grey50: '#F9FAFB',
  grey100: '#F2F4F6',
  grey200: '#E5E8EB',
  grey300: '#D1D6DB',
  grey400: '#B0B8C1',
  grey500: '#8B95A1',
  grey600: '#6B7684',
  grey700: '#4E5968',
  grey800: '#333D4B',
  grey900: '#191F28',

  // ── Grey Opacity (overlay/dim) ──
  greyOpacity50: 'rgba(0, 23, 51, 0.02)',
  greyOpacity200: 'rgba(0, 27, 55, 0.10)',
  greyOpacity500: 'rgba(3, 24, 50, 0.46)',
  greyOpacity800: 'rgba(0, 12, 30, 0.80)',
  greyOpacity900: 'rgba(2, 9, 19, 0.91)',

  // ── Brand (action, link, accent) — hue 252.2°, replaces TDS blue ──
  brand50: '#EFECFC', //  sampled — location icon chip tint
  brand200: '#AB97F8', //  interpolated
  brand400: '#8B70F5', //  sampled — ticket progress-bar gradient
  brand500: '#6541F2', //  sampled — primary CTA, active tab, distance text
  brand600: '#5129F0', //  interpolated — pressed
  brand700: '#3F12EF', //  interpolated — deep

  // ── Red (error, danger) ──
  red50: '#FFEEEE',
  red500: '#F04452',

  // ── Green (success, active) ──
  green50: '#F0FAF6',
  green500: '#03B26C',

  // ── Orange (caution) — `orange50` matches the "오늘 마감" badge tint ──
  orange50: '#FFF3E0',
  orange500: '#FE9800',

  // ── Yellow (warning) ──
  yellow50: '#FFF9E7',
  yellow400: '#FFD158',
  yellow500: '#FFC342',
  yellow800: '#EE8F11',
  yellow900: '#DD7D02',

  // ── Teal ──
  teal50: '#EDF8F8',
  teal500: '#18A5A5',

  // ── Utility ──
  highlight: '#FFE08C',

  // ── Surface (sampled from the PINDOM home screen) ──
  background: '#FFFFFF',
  greyBackground: '#F7F7F8', //  page ground
  layeredBackground: '#FFFFFF', //  cards
  floatedBackground: '#FFFFFF',

  // ── Dark surfaces — the ticket-balance card on 홈 ──
  darkSurface: '#171719',
  darkSurfaceRaised: '#2F2F30',
  darkSurfaceRaisedAlt: '#383839',

  // ══ 2b — the live palette ══════════════════════════════════════════════
  // Sampled from block `2b` of design/2026-08-20-prototype.html. See
  // docs/reference/design-tokens.md for where each value appears.

  // ── Ground. Three steps, all near-black; `2b` has no mid-tone surface ──
  ground: '#0B0B0B', //  deepest — also the ink used *on* the accent
  groundRaised: '#131313', //  the screen canvas
  groundChrome: '#171719', //  bars and frames

  // ── Accent. One value, used sparingly: section labels and the single most
  //    important number on screen. A five-stop ramp would undo the restraint ──
  acid500: '#58CF04',

  // ── Alert. 마감 임박 and other urgency ──
  alert500: '#FF5E00',

  // ── Ink. `2b` has no grey scale — secondary tone is white at an opacity ──
  ink: '#FFFFFF',
  inkOpacity700: 'rgba(255, 255, 255, 0.70)', //  secondary values
  inkOpacity500: 'rgba(255, 255, 255, 0.50)', //  supporting sentences
  inkOpacity450: 'rgba(255, 255, 255, 0.45)', //  metadata
  inkOpacity420: 'rgba(255, 255, 255, 0.42)', //  roman captions
  inkOpacity400: 'rgba(255, 255, 255, 0.40)', //  sub-labels
  inkOpacity350: 'rgba(255, 255, 255, 0.35)', //  row numerals

  // ── Rules, not cards. Structure comes from these, not from fills ──
  rule: 'rgba(255, 255, 255, 0.14)',
} as const;
