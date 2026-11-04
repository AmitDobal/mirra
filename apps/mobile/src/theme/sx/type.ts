import { font, type } from "../tokens";

/**
 * `font-*` → loaded font face. DESIGN typography keys (`font-headline-lg`, `font-label-caps`, …)
 * pick the family **and** weight: each face file is one weight (SpaceGrotesk_700Bold = 700), so
 * no `fontWeight` is set (Android would synthesize a second bold on top of the bold face).
 */
export const fontFamily: Record<string, string> = {
  display: font.display,
  headline: font.headline,
  "headline-semi": font.headlineSemi,
  label: font.label,
  "label-bold": font.labelBold,
  body: font.body,
  "body-medium": font.bodyMedium,
  "body-semi": font.bodySemi,
  "body-bold": font.bodyBold,
  // DESIGN.md typography scale (Space Grotesk headings/labels, Plus Jakarta Sans body).
  "display-lg": font.display, // 700
  "display-metric": font.display, // 700
  "headline-lg": font.headline, // 700
  "headline-md": font.headlineSemi, // 600
  "headline-sm": font.headlineSemi, // 600
  "body-lg": font.bodyMedium, // 500
  "body-md": font.body, // 400
  "body-sm": font.body, // 400
  "label-lg": font.label, // 600
  "label-md": font.label, // 600
  "label-caps": font.labelBold, // 700
};

type Scale = { fontSize: number; lineHeight: number; letterSpacing?: number };

const tracked = (t: { size: number; line: number; tracking: number }): Scale => ({
  fontSize: t.size,
  lineHeight: t.line,
  letterSpacing: t.tracking * t.size,
});

/** `text-<scale>` → size / line height / tracking (DESIGN.md + Tailwind defaults). */
export const typeScale: Record<string, Scale> = {
  "display-lg": tracked(type.displayLg),
  "display-metric": tracked(type.displayMetric),
  "headline-lg": tracked(type.headlineLg),
  "headline-md": tracked(type.headlineMd),
  "headline-sm": { fontSize: type.headlineSm.size, lineHeight: type.headlineSm.line },
  "body-lg": { fontSize: type.bodyLg.size, lineHeight: type.bodyLg.line },
  "body-md": { fontSize: type.bodyMd.size, lineHeight: type.bodyMd.line },
  "body-sm": { fontSize: type.bodySm.size, lineHeight: type.bodySm.line },
  "label-lg": tracked(type.labelLg),
  "label-md": tracked(type.labelMd),
  "label-caps": tracked(type.labelCaps),
  xl: { fontSize: 20, lineHeight: 28 },
  lg: { fontSize: 18, lineHeight: 28 },
  base: { fontSize: 16, lineHeight: 24 },
  sm: { fontSize: 14, lineHeight: 20 },
  xs: { fontSize: 12, lineHeight: 16 },
};

/** `font-bold` / `font-semibold` / `font-medium` weights. */
export const fontWeight: Record<string, string> = {
  bold: "700",
  semibold: "600",
  medium: "500",
};
