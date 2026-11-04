import { radius, space } from "../tokens";

export const spacing: Record<string, number> = {
  "space-xs": space.xs,
  "space-sm": space.sm,
  "space-md": space.md,
  "space-lg": space.lg,
  "space-xl": space.xl,
  margin: space.margin,
  gutter: space.gutter,
  touch: space.touch,
  dock: space.dock,
  "dock-clearance": space.dockClearance,
  "0": 0,
  "1": 4,
  "1.5": 6,
  "2": 8,
  "3": 12,
  "4": 16,
  "5": 20,
  "6": 24,
  "8": 32,
  "10": 40,
  "11": 44,
  "12": 48,
  "14": 56,
  "16": 64,
  "20": 80,
  "24": 96,
  "28": 112,
  "32": 128,
  "36": 144,
  "40": 160,
  "44": 176,
  "48": 192,
  "52": 208,
  "56": 224,
  "64": 256,
  full: 9999,
};

export const round: Record<string, number> = {
  none: 0,
  sm: radius.sm,
  DEFAULT: radius.DEFAULT,
  md: radius.md,
  lg: radius.lg,
  xl: radius.xl,
  full: radius.full,
  "2xl": 48,
};

/**
 * Tailwind arbitrary pixel value: `[24px]` → 24, `[12.5px]` → 12.5.
 * Shared by rounded / p / gap / min-h etc. so Stitch `rounded-[24px]` is never dropped.
 */
export const arbitraryPx = (token: string): number | undefined => {
  const match = token.match(/^\[(\d+(?:\.\d+)?)px\]$/);
  return match ? Number(match[1]) : undefined;
};

/** Spacing token, Tailwind step (`4` → 16), `12px`, or `[12px]`. */
export const spaceVal = (token: string): number | undefined => {
  if (token in spacing) return spacing[token];
  if (/^\d+$/.test(token)) return Number(token) * 4;
  if (/^\d+px$/.test(token)) return Number(token.replace("px", ""));
  return arbitraryPx(token);
};

/** `rounded-*` suffix → radius (token, raw number, or `[Npx]`). */
export const radiusVal = (key: string): number | undefined => {
  if (key in round) return round[key];
  if (/^\d+$/.test(key)) return Number(key);
  return arbitraryPx(key);
};
