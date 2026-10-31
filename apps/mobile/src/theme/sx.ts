import type { TextStyle, ViewStyle } from "react-native";

import { color, font, radius, space, type } from "./tokens";

/** Mutable style bag — RN style types are often readonly. */
type Style = Record<string, string | number | undefined>;

/** Tailwind color tokens → hex (DESIGN.md roles). */
const colors: Record<string, string> = {
  background: color.background,
  surface: color.surface,
  "surface-dim": color.surfaceDim,
  "surface-bright": color.surfaceBright,
  "surface-container-lowest": color.surfaceContainerLowest,
  "surface-container-low": color.surfaceContainerLow,
  "surface-container": color.surfaceContainer,
  "surface-container-high": color.surfaceContainerHigh,
  "surface-container-highest": color.surfaceContainerHighest,
  "surface-variant": color.surfaceVariant,
  "surface-tint": color.surfaceTint,
  "on-surface": color.onSurface,
  "on-surface-variant": color.onSurfaceVariant,
  "on-background": color.onBackground,
  "inverse-surface": color.inverseSurface,
  "inverse-on-surface": color.inverseOnSurface,
  outline: color.outline,
  "outline-variant": color.outlineVariant,
  primary: color.primary,
  "on-primary": color.onPrimary,
  "primary-container": color.primaryContainer,
  "on-primary-container": color.onPrimaryContainer,
  "inverse-primary": color.inversePrimary,
  "primary-fixed": color.primaryFixed,
  "primary-fixed-dim": color.primaryFixedDim,
  "on-primary-fixed": color.onPrimaryFixed,
  "on-primary-fixed-variant": color.onPrimaryFixedVariant,
  secondary: color.secondary,
  "on-secondary": color.onSecondary,
  "secondary-container": color.secondaryContainer,
  "on-secondary-container": color.onSecondaryContainer,
  "secondary-fixed": color.secondaryFixed,
  "secondary-fixed-dim": color.secondaryFixedDim,
  "on-secondary-fixed": color.onSecondaryFixed,
  "on-secondary-fixed-variant": color.onSecondaryFixedVariant,
  tertiary: color.tertiary,
  "on-tertiary": color.onTertiary,
  "tertiary-container": color.tertiaryContainer,
  "on-tertiary-container": color.onTertiaryContainer,
  "tertiary-fixed": color.tertiaryFixed,
  "tertiary-fixed-dim": color.tertiaryFixedDim,
  "on-tertiary-fixed": color.onTertiaryFixed,
  "on-tertiary-fixed-variant": color.onTertiaryFixedVariant,
  error: color.error,
  "on-error": color.onError,
  "error-container": color.errorContainer,
  "on-error-container": color.onErrorContainer,
  black: "#000000",
  white: "#ffffff",
  transparent: "transparent",
};

const spacing: Record<string, number> = {
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

const round: Record<string, number> = {
  none: 0,
  sm: radius.sm,
  DEFAULT: radius.DEFAULT,
  md: radius.md,
  lg: radius.lg,
  xl: radius.xl,
  full: radius.full,
  "2xl": 48,
};

const fontFamily: Record<string, string> = {
  display: font.display,
  headline: font.headline,
  "headline-semi": font.headlineSemi,
  label: font.label,
  "label-bold": font.labelBold,
  body: font.body,
  "body-medium": font.bodyMedium,
  "body-semi": font.bodySemi,
  "body-bold": font.bodyBold,
};

const typeScale: Record<
  string,
  { fontSize: number; lineHeight: number; letterSpacing?: number; fontWeight?: string }
> = {
  "display-lg": {
    fontSize: type.displayLg.size,
    lineHeight: type.displayLg.line,
    letterSpacing: type.displayLg.tracking * type.displayLg.size,
  },
  "display-metric": {
    fontSize: type.displayMetric.size,
    lineHeight: type.displayMetric.line,
    letterSpacing: type.displayMetric.tracking * type.displayMetric.size,
  },
  "headline-lg": {
    fontSize: type.headlineLg.size,
    lineHeight: type.headlineLg.line,
    letterSpacing: type.headlineLg.tracking * type.headlineLg.size,
  },
  "headline-md": {
    fontSize: type.headlineMd.size,
    lineHeight: type.headlineMd.line,
    letterSpacing: type.headlineMd.tracking * type.headlineMd.size,
  },
  "headline-sm": {
    fontSize: type.headlineSm.size,
    lineHeight: type.headlineSm.line,
  },
  "body-lg": { fontSize: type.bodyLg.size, lineHeight: type.bodyLg.line },
  "body-md": { fontSize: type.bodyMd.size, lineHeight: type.bodyMd.line },
  "body-sm": { fontSize: type.bodySm.size, lineHeight: type.bodySm.line },
  "label-lg": {
    fontSize: type.labelLg.size,
    lineHeight: type.labelLg.line,
    letterSpacing: type.labelLg.tracking * type.labelLg.size,
  },
  "label-md": {
    fontSize: type.labelMd.size,
    lineHeight: type.labelMd.line,
    letterSpacing: type.labelMd.tracking * type.labelMd.size,
  },
  "label-caps": {
    fontSize: type.labelCaps.size,
    lineHeight: type.labelCaps.line,
    letterSpacing: type.labelCaps.tracking * type.labelCaps.size,
  },
  xl: { fontSize: 20, lineHeight: 28 },
  lg: { fontSize: 18, lineHeight: 28 },
  base: { fontSize: 16, lineHeight: 24 },
  sm: { fontSize: 14, lineHeight: 20 },
  xs: { fontSize: 12, lineHeight: 16 },
};

const parseColor = (token: string): string | undefined => {
  const slash = token.indexOf("/");
  if (slash === -1) return colors[token];
  const base = token.slice(0, slash);
  const pct = Number(token.slice(slash + 1));
  const hex = colors[base];
  if (!hex || Number.isNaN(pct)) return hex;
  const alpha = Math.round((pct / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  if (hex.length === 7) return `${hex}${alpha}`;
  return hex;
};

/**
 * Tailwind arbitrary pixel value: `[24px]` → 24, `[12.5px]` → 12.5.
 * Shared by rounded / p / gap / min-h etc. so Stitch `rounded-[24px]` is never dropped.
 */
const arbitraryPx = (token: string): number | undefined => {
  const match = token.match(/^\[(\d+(?:\.\d+)?)px\]$/);
  return match ? Number(match[1]) : undefined;
};

const spaceVal = (token: string): number | undefined => {
  if (token in spacing) return spacing[token];
  if (/^\d+$/.test(token)) return Number(token) * 4;
  if (/^\d+px$/.test(token)) return Number(token.replace("px", ""));
  return arbitraryPx(token);
};

const applyOne = (cls: string, out: Style): void => {
  if (!cls || cls === "true" || cls === "false") return;

  // Layout
  if (cls === "flex-1") {
    out.flex = 1;
    return;
  }
  if (cls === "flex-row") {
    out.flexDirection = "row";
    return;
  }
  if (cls === "flex-col") {
    out.flexDirection = "column";
    return;
  }
  if (cls === "flex-wrap") {
    out.flexWrap = "wrap";
    return;
  }
  if (cls === "items-center") {
    out.alignItems = "center";
    return;
  }
  if (cls === "items-start") {
    out.alignItems = "flex-start";
    return;
  }
  if (cls === "items-end") {
    out.alignItems = "flex-end";
    return;
  }
  if (cls === "items-stretch") {
    out.alignItems = "stretch";
    return;
  }
  if (cls === "items-baseline") {
    out.alignItems = "baseline";
    return;
  }
  if (cls === "justify-center") {
    out.justifyContent = "center";
    return;
  }
  if (cls === "justify-between") {
    out.justifyContent = "space-between";
    return;
  }
  if (cls === "justify-start") {
    out.justifyContent = "flex-start";
    return;
  }
  if (cls === "justify-end") {
    out.justifyContent = "flex-end";
    return;
  }
  if (cls === "self-start") {
    out.alignSelf = "flex-start";
    return;
  }
  if (cls === "self-end") {
    out.alignSelf = "flex-end";
    return;
  }
  if (cls === "self-center") {
    out.alignSelf = "center";
    return;
  }
  if (cls === "self-stretch") {
    out.alignSelf = "stretch";
    return;
  }
  if (cls === "absolute") {
    out.position = "absolute";
    return;
  }
  if (cls === "relative") {
    out.position = "relative";
    return;
  }
  if (cls === "inset-0") {
    out.top = 0;
    out.right = 0;
    out.bottom = 0;
    out.left = 0;
    return;
  }
  if (cls === "inset-x-0") {
    out.left = 0;
    out.right = 0;
    return;
  }
  if (cls === "bottom-0") {
    out.bottom = 0;
    return;
  }
  if (cls === "top-0") {
    out.top = 0;
    return;
  }
  if (cls === "overflow-hidden") {
    out.overflow = "hidden";
    return;
  }
  if (cls === "grow" || cls === "flex-grow") {
    out.flexGrow = 1;
    return;
  }
  if (cls === "shrink-0") {
    out.flexShrink = 0;
    return;
  }
  if (cls === "uppercase") {
    out.textTransform = "uppercase";
    return;
  }
  if (cls === "text-center") {
    out.textAlign = "center";
    return;
  }
  if (cls === "text-left") {
    out.textAlign = "left";
    return;
  }
  if (cls === "text-right") {
    out.textAlign = "right";
    return;
  }
  if (cls === "underline") {
    out.textDecorationLine = "underline";
    return;
  }
  if (cls === "tracking-widest") {
    out.letterSpacing = 2;
    return;
  }
  if (cls === "border") {
    out.borderWidth = 1;
    return;
  }
  if (cls === "border-transparent") {
    out.borderColor = "transparent";
    return;
  }
  if (cls === "bg-transparent") {
    out.backgroundColor = "transparent";
    return;
  }
  if (cls === "opacity-0") {
    out.opacity = 0;
    return;
  }
  if (cls === "opacity-40") {
    out.opacity = 0.4;
    return;
  }
  if (cls === "opacity-60") {
    out.opacity = 0.6;
    return;
  }
  if (cls === "opacity-90") {
    out.opacity = 0.9;
    return;
  }
  if (cls === "opacity-100") {
    out.opacity = 1;
    return;
  }
  if (cls === "z-50") {
    out.zIndex = 50;
    return;
  }
  if (cls === "w-full") {
    out.width = "100%";
    return;
  }
  if (cls === "h-full") {
    out.height = "100%";
    return;
  }
  if (cls === "min-w-0") {
    out.minWidth = 0;
    return;
  }

  // gap / space
  let m = cls.match(/^gap-(.+)$/);
  if (m) {
    const v = spaceVal(m[1]);
    if (v !== undefined) out.gap = v;
    return;
  }

  // padding
  m = cls.match(/^p-(.+)$/);
  if (m) {
    const v = spaceVal(m[1]);
    if (v !== undefined) out.padding = v;
    return;
  }
  m = cls.match(/^px-(.+)$/);
  if (m) {
    const v = spaceVal(m[1]);
    if (v !== undefined) {
      out.paddingHorizontal = v;
    }
    return;
  }
  m = cls.match(/^py-(.+)$/);
  if (m) {
    const v = spaceVal(m[1]);
    if (v !== undefined) out.paddingVertical = v;
    return;
  }
  m = cls.match(/^pt-(.+)$/);
  if (m) {
    const v = spaceVal(m[1]);
    if (v !== undefined) out.paddingTop = v;
    return;
  }
  m = cls.match(/^pb-(.+)$/);
  if (m) {
    const v = spaceVal(m[1]);
    if (v !== undefined) out.paddingBottom = v;
    return;
  }
  m = cls.match(/^pl-(.+)$/);
  if (m) {
    const v = spaceVal(m[1]);
    if (v !== undefined) out.paddingLeft = v;
    return;
  }
  m = cls.match(/^pr-(.+)$/);
  if (m) {
    const v = spaceVal(m[1]);
    if (v !== undefined) out.paddingRight = v;
    return;
  }

  // margin
  m = cls.match(/^m-(.+)$/);
  if (m) {
    const v = spaceVal(m[1]);
    if (v !== undefined) out.margin = v;
    return;
  }
  m = cls.match(/^mx-(.+)$/);
  if (m) {
    const v = spaceVal(m[1]);
    if (v !== undefined) out.marginHorizontal = v;
    return;
  }
  m = cls.match(/^my-(.+)$/);
  if (m) {
    const v = spaceVal(m[1]);
    if (v !== undefined) out.marginVertical = v;
    return;
  }
  m = cls.match(/^mt-(.+)$/);
  if (m) {
    const v = spaceVal(m[1]);
    if (v !== undefined) out.marginTop = v;
    return;
  }
  m = cls.match(/^mb-(.+)$/);
  if (m) {
    const v = spaceVal(m[1]);
    if (v !== undefined) out.marginBottom = v;
    return;
  }
  m = cls.match(/^ml-(.+)$/);
  if (m) {
    const v = spaceVal(m[1]);
    if (v !== undefined) out.marginLeft = v;
    return;
  }
  m = cls.match(/^mr-(.+)$/);
  if (m) {
    const v = spaceVal(m[1]);
    if (v !== undefined) out.marginRight = v;
    return;
  }

  // size
  m = cls.match(/^h-(.+)$/);
  if (m) {
    const v = spaceVal(m[1]);
    if (v !== undefined) out.height = v;
    return;
  }
  m = cls.match(/^w-(.+)$/);
  if (m) {
    const v = spaceVal(m[1]);
    if (v !== undefined) out.width = v;
    return;
  }
  m = cls.match(/^min-h-(.+)$/);
  if (m) {
    const v = spaceVal(m[1]);
    if (v !== undefined) out.minHeight = v;
    return;
  }
  m = cls.match(/^max-w-\[(\d+)px\]$/);
  if (m) {
    out.maxWidth = Number(m[1]);
    return;
  }
  m = cls.match(/^max-h-\[(\d+)px\]$/);
  if (m) {
    out.maxHeight = Number(m[1]);
    return;
  }
  m = cls.match(/^aspect-\[(\d+)\/(\d+)\]$/);
  if (m) {
    out.aspectRatio = Number(m[1]) / Number(m[2]);
    return;
  }
  if (cls === "leading-tight") {
    // Relative tighten only when a type scale already set lineHeight.
    if (typeof out.lineHeight === "number" && typeof out.fontSize === "number") {
      out.lineHeight = Math.max(out.fontSize + 2, Math.round(out.lineHeight * 0.92));
    }
    return;
  }
  m = cls.match(/^max-w-(.+)$/);
  if (m) {
    const v = spaceVal(m[1]);
    if (v !== undefined) out.maxWidth = v;
    return;
  }
  m = cls.match(/^min-w-(.+)$/);
  if (m) {
    const v = spaceVal(m[1]);
    if (v !== undefined) out.minWidth = v;
    return;
  }

  // rounded
  if (cls === "rounded") {
    out.borderRadius = radius.DEFAULT;
    return;
  }
  m = cls.match(/^rounded-(.+)$/);
  if (m) {
    const key = m[1];
    if (key in round) out.borderRadius = round[key];
    else if (/^\d+$/.test(key)) out.borderRadius = Number(key);
    else {
      const px = arbitraryPx(key);
      if (px !== undefined) out.borderRadius = px;
    }
    return;
  }

  // colors
  m = cls.match(/^bg-(.+)$/);
  if (m) {
    const c = parseColor(m[1]);
    if (c) out.backgroundColor = c;
    return;
  }
  m = cls.match(/^text-(.+)$/);
  if (m) {
    const key = m[1];
    if (key in typeScale) {
      Object.assign(out, typeScale[key]);
      return;
    }
    const c = parseColor(key);
    if (c) {
      out.color = c;
      return;
    }
    return;
  }
  m = cls.match(/^border-(.+)$/);
  if (m) {
    const key = m[1];
    if (key === "0") {
      out.borderWidth = 0;
      return;
    }
    const c = parseColor(key);
    if (c) {
      out.borderColor = c;
      return;
    }
    return;
  }

  // font family
  m = cls.match(/^font-(.+)$/);
  if (m) {
    const key = m[1];
    if (key in fontFamily) {
      out.fontFamily = fontFamily[key];
      return;
    }
    if (key === "bold") {
      out.fontWeight = "700";
      return;
    }
    if (key === "semibold") {
      out.fontWeight = "600";
      return;
    }
    if (key === "medium") {
      out.fontWeight = "500";
      return;
    }
  }
};

/**
 * Maps Mirra Tailwind-like class strings to RN styles.
 * NativeWind is disabled on Expo SDK 58 (css-interop + React 19.3 break).
 */
export const sx = (
  ...parts: Array<string | false | null | undefined>
): ViewStyle & TextStyle => {
  const out: Style = {};
  for (const part of parts) {
    if (!part) continue;
    for (const cls of part.split(/\s+/)) {
      applyOne(cls, out);
    }
  }
  return out as ViewStyle & TextStyle;
};
