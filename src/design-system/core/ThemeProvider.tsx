/**
 * SDS Theme Provider — seed token → derived token system.
 *
 * One seed colour (`token.color.primary`) drives every accent-coloured
 * component in the system. In upstream SDS only `Button` consumed this seed and
 * the other eleven accent components reached straight past it to a hardcoded
 * `SdsColors.blue500`, which meant re-theming touched one component and missed
 * the rest. PINDOM threads all of them through the derived `accent` group below,
 * so changing the seed genuinely re-themes the app.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { SdsColors } from '@/design-system/tokens';
import { readableOn } from '../utils/color';
import { colorSeeds, type getAdaptiveColors } from '../foundation/colors';
import { useAdaptive } from './AdaptiveColorProvider';

/** The preference-resolved palette the derive step reads its greys from. */
type AdaptiveColors = ReturnType<typeof getAdaptiveColors>;

// ── Seed Token ──

export interface SeedToken {
  color: {
    primary: string;
  };
}

export const defaultSeedToken: SeedToken = {
  color: {
    primary: colorSeeds.primary,
  },
};

// ── Colour math ──

/** Parse any hex (#RGB, #RRGGBB, #RRGGBBAA) into rgba() with custom alpha */
function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * Re-render a colour at a different lightness, preserving hue.
 *
 * Used to derive the tint/pressed stops from the seed rather than hardcoding
 * them, so a custom seed produces a coherent ramp instead of a purple tint
 * under some other brand colour. With the default PINDOM seed the outputs are
 * identical to the hand-authored `SdsColors.brand*` stops.
 *
 * `satScale` exists because a near-white tint reads as too vivid at the seed's
 * full saturation — the design's own tint sits at ~0.83 of it.
 */
function withLightness(hex: string, lightness: number, satScale = 1): string {
  const { r, g, b } = parseHex(hex);
  const [h, , s] = rgbToHsl(r, g, b);
  return hslToHex(h, lightness, Math.min(1, s * satScale));
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, l, 0];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h, l, s];
}

function hslToHex(h: number, l: number, s: number): string {
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1 / 3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1 / 3);
  }
  const to255 = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${to255(r)}${to255(g)}${to255(b)}`;
}

function hueToRgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

// ── Derived Tokens (computed from seed) ──

export interface ButtonDerivedTheme {
  backgroundFillColor: string;
  textFillColor: string;
  backgroundWeakColor: string;
  textWeakColor: string;
  dimFillColor: string;
  dimWeakColor: string;
  loaderFillColor: string;
  loaderWeakColor: string;
}

/**
 * Accent theme shared by every non-button component that carries the brand
 * colour: Radio, Checkbox, Switch, TextField, ProgressBar, Toast, Loader,
 * StepperRow, ListFooter, AccordionList, Badge.
 */
export interface AccentDerivedTheme {
  /** The brand colour itself — fills, active states, accent text. */
  fillColor: string;
  /** Pressed / active-depressed variant of `fillColor`. */
  fillPressedColor: string;
  /** Near-white tint of the brand — chip and badge backgrounds. */
  weakColor: string;
  /** Light brand — legible on dark surfaces (e.g. toast action text). */
  softColor: string;
  /** Content colour that sits on top of `fillColor`. */
  onFillColor: string;
  /** Translucent brand — ripples and dims. */
  dimColor: string;
}

export interface DerivedToken {
  button: ButtonDerivedTheme;
  accent: AccentDerivedTheme;
}

/**
 * The readable foreground for a filled accent surface.
 *
 * This used to be hardcoded to white, which held only while the accent was a
 * dark violet. PINDOM's accent is a light acid green — white on it measures
 * 2.03:1, the near-black ground 9.69:1 — so the choice is measured rather than
 * assumed. That is also what keeps the seed genuinely swappable: a future
 * accent of any lightness gets a readable label without editing this file.
 */
function onAccent(fill: string): string {
  return readableOn(fill, {
    onLight: SdsColors.ground,
    onDark: SdsColors.ink,
  });
}

function deriveButtonTheme(seed: SeedToken, adaptive: AdaptiveColors): ButtonDerivedTheme {
  const primary = seed.color.primary;
  return {
    backgroundFillColor: primary,
    textFillColor: onAccent(primary),
    // Read from the adaptive palette, not the raw tokens: these two are the
    // surface behind a weak button and the dot inside a filled one, so both
    // have to follow the colour preference. Pinned to SdsColors they painted
    // #F2F4F6 and #FFFFFF on the 2b ground.
    backgroundWeakColor: adaptive.grey100,
    textWeakColor: primary,
    dimFillColor: hexToRgba(primary, 0.25),
    // TODO(2b): the greyOpacity family is not in the adaptive map, so this dim
    // stays a 2% near-black — near-invisible as press feedback on a dark
    // button. Extending the map is a token decision, not a substitution.
    dimWeakColor: SdsColors.greyOpacity50,
    loaderFillColor: adaptive.background,
    loaderWeakColor: primary,
  };
}

function deriveAccentTheme(seed: SeedToken): AccentDerivedTheme {
  const primary = seed.color.primary;
  const [, l] = rgbToHsl(
    parseHex(primary).r,
    parseHex(primary).g,
    parseHex(primary).b,
  );
  return {
    fillColor: primary,
    fillPressedColor: withLightness(primary, Math.max(0, l - 0.051)),
    weakColor: withLightness(primary, 0.957, 0.83),
    softColor: withLightness(primary, 0.782),
    onFillColor: onAccent(primary),
    dimColor: hexToRgba(primary, 0.25),
  };
}

function deriveToken(seed: SeedToken, adaptive: AdaptiveColors): DerivedToken {
  return {
    button: deriveButtonTheme(seed, adaptive),
    // The accent group derives everything from the seed, so it needs no palette.
    accent: deriveAccentTheme(seed),
  };
}

// ── Theme Token (seed + derived) ──

export type ThemeToken = SeedToken & DerivedToken;

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ── Context ──

interface ThemeContextValue {
  token: ThemeToken;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  token?: DeepPartial<ThemeToken>;
  children: React.ReactNode;
}

export function ThemeProvider({ token: customToken, children }: ThemeProviderProps) {
  const parentTheme = useContext(ThemeContext);
  const adaptive = useAdaptive();

  const value = useMemo<ThemeContextValue>(() => {
    const baseSeed = parentTheme?.token ?? defaultSeedToken;

    // Merge custom token with base
    const seed: SeedToken = {
      color: {
        primary: customToken?.color?.primary ?? baseSeed.color.primary,
      },
    };

    const derived = deriveToken(seed, adaptive);

    // Allow overriding derived tokens directly
    const mergedButton: ButtonDerivedTheme = {
      ...derived.button,
      ...(customToken?.button as Partial<ButtonDerivedTheme> | undefined),
    };
    const mergedAccent: AccentDerivedTheme = {
      ...derived.accent,
      ...(customToken?.accent as Partial<AccentDerivedTheme> | undefined),
    };

    return {
      token: {
        ...seed,
        button: mergedButton,
        accent: mergedAccent,
      },
    };
  }, [customToken, parentTheme, adaptive]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  // Called unconditionally — hooks cannot sit inside the branch below. With no
  // AdaptiveColorProvider mounted this returns the light default, which is the
  // same assumption the fallback already made.
  const adaptive = useAdaptive();
  if (!ctx) {
    // Fallback: return default theme if no provider
    const seed = defaultSeedToken;
    return { token: { ...seed, ...deriveToken(seed, adaptive) } };
  }
  return ctx;
}

export { ThemeContext };
