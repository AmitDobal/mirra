/**
 * Standards lookup + percentile math (research §2.4 step 2). Pure.
 * Anchors are the values at percentiles 5 / 20 / 50 / 80 / 95.
 */
import { STANDARDS, type StandardsRow, type StandardsTable } from "../../data/strength-standards";
import type { AnchorId, ExerciseStandard } from "../exercise-library/types";

export type Anchors = readonly [number, number, number, number, number];
export type StrengthSex = "male" | "female" | null;

export const ANCHOR_PCTS = [5, 20, 50, 80, 95] as const;
/** Cap: nobody is "better than 100%". */
export const MAX_PCT = 99.9;
/** Allometric exponent used outside the table's bodyweight range. */
const ALLOMETRIC = 0.67;

const rowAnchors = (r: StandardsRow): Anchors => [r[1], r[2], r[3], r[4], r[5]];

const scale = (a: Anchors, k: number): Anchors => a.map((v) => v * k) as unknown as Anchors;

const mix = (a: Anchors, b: Anchors, t: number): Anchors =>
  a.map((v, i) => v + (b[i]! - v) * t) as unknown as Anchors;

/** Linear by bodyweight between rows; allometric beyond the first / last row. */
export const anchorsFromRows = (rows: readonly StandardsRow[], bw: number): Anchors => {
  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  if (bw <= first[0]) return scale(rowAnchors(first), (bw / first[0]) ** ALLOMETRIC);
  if (bw >= last[0]) return scale(rowAnchors(last), (bw / last[0]) ** ALLOMETRIC);
  for (let i = 1; i < rows.length; i += 1) {
    const hi = rows[i]!;
    if (bw <= hi[0]) {
      const lo = rows[i - 1]!;
      return mix(rowAnchors(lo), rowAnchors(hi), (bw - lo[0]) / (hi[0] - lo[0]));
    }
  }
  return rowAnchors(last);
};

/** Anchor table for a sex at a bodyweight. Unknown sex = mean of both cohorts. */
export const anchorsAt = (
  anchorId: AnchorId,
  sex: StrengthSex,
  bw: number,
  tables: { male: StandardsTable; female: StandardsTable } = STANDARDS,
): Anchors => {
  if (sex === "male" || sex === "female") return anchorsFromRows(tables[sex][anchorId], bw);
  return mix(anchorsFromRows(tables.male[anchorId], bw), anchorsFromRows(tables.female[anchorId], bw), 0.5);
};

/** Anchors for a library standard (`anchor` or `parent × ratio`). */
export const anchorsForStandard = (
  standard: ExerciseStandard,
  sex: StrengthSex,
  bw: number,
): Anchors =>
  "anchor" in standard
    ? anchorsAt(standard.anchor, sex, bw)
    : scale(anchorsAt(standard.parent, sex, bw), standard.ratio);

export const rootAnchor = (standard: ExerciseStandard): AnchorId =>
  "anchor" in standard ? standard.anchor : standard.parent;

/** Piecewise-linear percentile. Below T5: `5 × v / T5`. Above T95: +5 per 25% of T95, capped. */
export const pctOf = (value: number, a: Anchors): number => {
  if (!(value > 0)) return 0;
  if (value <= a[0]) return (5 * value) / a[0];
  for (let i = 1; i < a.length; i += 1) {
    if (value <= a[i]!) {
      const lo = a[i - 1]!;
      const t = (value - lo) / (a[i]! - lo);
      return ANCHOR_PCTS[i - 1]! + t * (ANCHOR_PCTS[i]! - ANCHOR_PCTS[i - 1]!);
    }
  }
  return Math.min(MAX_PCT, 95 + (5 * (value - a[4])) / (0.25 * a[4]));
};

/** Inverse of `pctOf` (value needed for a percentile). */
export const valueAtPct = (pct: number, a: Anchors): number => {
  const p = Math.max(0, Math.min(MAX_PCT, pct));
  if (p <= 5) return (p / 5) * a[0];
  if (p > 95) return a[4] + ((p - 95) / 5) * 0.25 * a[4];
  for (let i = 1; i < a.length; i += 1) {
    if (p <= ANCHOR_PCTS[i]!) {
      const t = (p - ANCHOR_PCTS[i - 1]!) / (ANCHOR_PCTS[i]! - ANCHOR_PCTS[i - 1]!);
      return a[i - 1]! + t * (a[i]! - a[i - 1]!);
    }
  }
  return a[4];
};
