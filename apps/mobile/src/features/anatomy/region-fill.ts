/**
 * Pure fill resolution for anatomy regions (arch §2.2). No React here so the
 * figure can memoize one result per (mode, sex, side) and tests can run in node.
 */
import { color } from "../../theme/tokens";
import { labelOf, tierColor, tierOfStep, type TierPlace } from "../strength-ui/tier-meta";
import { MUSCLE_LABEL, type MuscleId } from "./muscle-ids";
import type { FigurePart } from "./paths/types";
import { musclesForSlug } from "./region-map";
import type { AnatomySide } from "./paths";

export type MuscleRole = "primary" | "secondary";

export type AnatomyMode =
  | { readonly kind: "focus"; readonly muscles: readonly { readonly id: MuscleId; readonly role: MuscleRole }[] }
  | { readonly kind: "tier"; readonly steps: Partial<Record<MuscleId, number>> };

/** `base` = non-muscle art (head, hands, knees, feet): plain surface, never tinted. */
export type RegionPaint =
  | { readonly kind: "primary" | "secondary" | "passive" | "base" }
  | { readonly kind: "tier"; readonly place: TierPlace };

export type RegionFill = {
  readonly key: string;
  readonly d: readonly string[];
  readonly muscles: readonly MuscleId[];
  readonly paint: RegionPaint;
  readonly fill: string;
  readonly fillOpacity: number;
  /** Undefined for non-muscle parts (head, hands…): not pressable, no label. */
  readonly label?: string;
};

export const PASSIVE_OPACITY = 0.55;
const PASSIVE: RegionPaint = { kind: "passive" };
const BASE: RegionPaint = { kind: "base" };

/** Strongest role wins (focus) or highest step wins (tier) when muscles share a region. */
export const regionPaint = (mode: AnatomyMode, muscles: readonly MuscleId[]): RegionPaint => {
  if (muscles.length === 0) return BASE;
  if (mode.kind === "focus") {
    let best: MuscleRole | null = null;
    for (const m of mode.muscles) {
      if (!muscles.includes(m.id)) continue;
      if (m.role === "primary") return { kind: "primary" };
      best = "secondary";
    }
    return best ? { kind: best } : PASSIVE;
  }
  let top = -1;
  for (const id of muscles) {
    const step = mode.steps[id];
    if (typeof step === "number" && Number.isFinite(step) && step > top) top = step;
  }
  return top < 0 ? PASSIVE : { kind: "tier", place: tierOfStep(top) };
};

export const paintFill = (paint: RegionPaint): { fill: string; fillOpacity: number } => {
  switch (paint.kind) {
    case "primary":
      return { fill: color.primaryContainer, fillOpacity: 1 };
    case "secondary":
      return { fill: color.secondary, fillOpacity: 1 };
    case "tier":
      return { fill: tierColor(paint.place.tier), fillOpacity: 1 };
    case "base":
      return { fill: color.surfaceContainerHigh, fillOpacity: 1 };
    default:
      return { fill: color.surfaceContainerHighest, fillOpacity: PASSIVE_OPACITY };
  }
};

const paintWord = (paint: RegionPaint, mode: AnatomyMode): string => {
  if (paint.kind === "tier") return labelOf(paint.place);
  if (paint.kind === "passive" || paint.kind === "base") return mode.kind === "tier" ? "unranked" : "not targeted";
  return paint.kind;
};

/** "Chest, Gold II" / "Front delts and side delts, secondary". */
export const regionLabel = (muscles: readonly MuscleId[], paint: RegionPaint, mode: AnatomyMode) => {
  const names = muscles.map((m, i) => (i === 0 ? MUSCLE_LABEL[m] : MUSCLE_LABEL[m].toLowerCase()));
  return `${names.join(" and ")}, ${paintWord(paint, mode)}`;
};

/** Resolve every drawn part of one figure. */
export const resolveRegions = (
  parts: readonly FigurePart[],
  side: AnatomySide,
  mode: AnatomyMode,
): RegionFill[] =>
  parts.map((part) => {
    const muscles = musclesForSlug(side, part.slug);
    const paint = regionPaint(mode, muscles);
    return {
      key: part.slug,
      d: part.d,
      muscles,
      paint,
      ...paintFill(paint),
      label: muscles.length > 0 ? regionLabel(muscles, paint, mode) : undefined,
    };
  });
