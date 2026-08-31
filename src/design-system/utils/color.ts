/**
 * Colour helpers for cases where a hex string is not enough.
 *
 * Reanimated worklets run on the UI thread and cannot call arbitrary JS, so a
 * component that needs to interpolate a colour's alpha inside a worklet must
 * capture the numeric channels on the JS side first. `hexToRgbChannels` exists
 * for exactly that hand-off.
 */
export interface RgbChannels {
  r: number;
  g: number;
  b: number;
}

/** Parse `#RGB` or `#RRGGBB(AA)` into 0–255 channels. */
export function hexToRgbChannels(hex: string): RgbChannels {
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
 * WCAG relative luminance, 0 (black) to 1 (white).
 *
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgbChannels(hex);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  );
}

/**
 * Pick the readable foreground for a fill, by measuring it.
 *
 * The theme derivation used to hardcode white here, which held only because the
 * accent was a dark violet. PINDOM's accent is a light acid green: white on it
 * measures 2.03:1 and is unreadable, while the near-black ground measures
 * 9.69:1. Measuring rather than assuming is what keeps the seed genuinely
 * swappable — see ADR 0003.
 */
export function readableOn(
  fill: string,
  options: { onLight: string; onDark: string },
): string {
  return relativeLuminance(fill) > 0.35 ? options.onLight : options.onDark;
}
