/**
 * Kinetic Performance tokens — mapped EXACTLY from
 * stitch_mirra_ai_personal_trainer/kinetic_performance/DESIGN.md
 * Do not invent colors. Components must use these roles, never raw hex.
 */

export const color = {
  background: "#131313",
  surface: "#131313",
  surfaceDim: "#131313",
  surfaceBright: "#393939",
  surfaceContainerLowest: "#0e0e0e",
  surfaceContainerLow: "#1c1b1b",
  surfaceContainer: "#201f1f",
  surfaceContainerHigh: "#2a2a2a",
  surfaceContainerHighest: "#353534",
  surfaceVariant: "#353534",
  surfaceTint: "#b0d434",
  onSurface: "#e5e2e1",
  onSurfaceVariant: "#c5c9b0",
  onBackground: "#e5e2e1",
  inverseSurface: "#e5e2e1",
  inverseOnSurface: "#313030",
  outline: "#8f937c",
  outlineVariant: "#454936",
  primary: "#ffffff",
  onPrimary: "#293500",
  primaryContainer: "#cbf150",
  onPrimaryContainer: "#566c00",
  inversePrimary: "#516600",
  primaryFixed: "#cbf150",
  primaryFixedDim: "#b0d434",
  onPrimaryFixed: "#161e00",
  onPrimaryFixedVariant: "#3c4d00",
  secondary: "#d1beef",
  onSecondary: "#372950",
  secondaryContainer: "#50426b",
  onSecondaryContainer: "#c2b0e0",
  secondaryFixed: "#ebdcff",
  secondaryFixedDim: "#d1beef",
  onSecondaryFixed: "#21143a",
  onSecondaryFixedVariant: "#4e4068",
  tertiary: "#ffffff",
  onTertiary: "#670024",
  tertiaryContainer: "#ffd9dd",
  onTertiaryContainer: "#b53354",
  tertiaryFixed: "#ffd9dd",
  tertiaryFixedDim: "#ffb2bd",
  onTertiaryFixed: "#400013",
  onTertiaryFixedVariant: "#8c1037",
  error: "#ffb4ab",
  onError: "#690005",
  errorContainer: "#93000a",
  onErrorContainer: "#ffdad6",
} as const;

/** DESIGN.md spacing (rem → px @ 16). */
export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 28,
  gutter: 16,
  margin: 20,
  /** Viewport bottom clearance for floating dock (DESIGN.md Layout). */
  dockClearance: 96,
  /** Floating dock height. */
  dock: 64,
  touch: 44,
} as const;

/** DESIGN.md rounded. */
export const radius = {
  sm: 8,
  DEFAULT: 16,
  md: 24,
  lg: 32,
  xl: 48,
  full: 9999,
} as const;

export const font = {
  display: "SpaceGrotesk_700Bold",
  headline: "SpaceGrotesk_700Bold",
  headlineSemi: "SpaceGrotesk_600SemiBold",
  label: "SpaceGrotesk_600SemiBold",
  labelBold: "SpaceGrotesk_700Bold",
  body: "PlusJakartaSans_400Regular",
  bodyMedium: "PlusJakartaSans_500Medium",
  bodySemi: "PlusJakartaSans_600SemiBold",
  bodyBold: "PlusJakartaSans_700Bold",
} as const;

export const type = {
  displayLg: { size: 48, line: 52, weight: "700" as const, tracking: -0.03 },
  displayMetric: { size: 38, line: 42, weight: "700" as const, tracking: -0.02 },
  headlineLg: { size: 28, line: 34, weight: "700" as const, tracking: -0.02 },
  headlineMd: { size: 22, line: 28, weight: "600" as const, tracking: -0.01 },
  headlineSm: { size: 18, line: 24, weight: "600" as const, tracking: 0 },
  bodyLg: { size: 16, line: 24, weight: "500" as const, tracking: 0 },
  bodyMd: { size: 14, line: 20, weight: "400" as const, tracking: 0 },
  bodySm: { size: 12, line: 16, weight: "400" as const, tracking: 0 },
  labelLg: { size: 14, line: 18, weight: "600" as const, tracking: 0.02 },
  labelMd: { size: 12, line: 16, weight: "600" as const, tracking: 0.04 },
  labelCaps: { size: 11, line: 14, weight: "700" as const, tracking: 0.08 },
} as const;

/** Floating dock shadow from DESIGN.md Elevation Level 3. */
export const shadow = {
  dock: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 32,
    elevation: 12,
  },
} as const;

export const tokens = { color, space, radius, font, type, shadow } as const;
