import { color } from "../tokens";

/** Tailwind color tokens → hex (DESIGN.md roles). */
export const colors: Record<string, string> = {
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
  "streak-fire": color.streakFire,
  "streak-fire-deep": color.streakFireDeep,
  error: color.error,
  "on-error": color.onError,
  "error-container": color.errorContainer,
  "on-error-container": color.onErrorContainer,
  black: "#000000",
  white: "#ffffff",
  transparent: "transparent",
};

/** `primary-fixed` → hex; `primary-fixed/40` → hex with an alpha byte. */
export const parseColor = (token: string): string | undefined => {
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
