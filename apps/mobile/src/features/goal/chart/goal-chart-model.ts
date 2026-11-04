/**
 * Pure geometry for `GoalChart` (arch §7). No RN / SVG imports → `node --test`.
 * Input series are weekly kg points from `start` (engine `GoalChart`); labels convert
 * to the display unit. Shared by S43 (onboarding), S44 (full) and S45/S46 (spark).
 */
import { goalEngine } from "@mirra/contracts";

import { monthCaps, weightNumber, type WeightUnit } from "../goal-format";

export type GoalChartVariant = "full" | "onboarding" | "spark";

/** Same shape as the engine / API `GoalChart` (kg, weekly from `start`). */
export type GoalChartData = {
  readonly start: string;
  readonly unit: WeightUnit;
  readonly targetKg: number | null;
  readonly planned: readonly number[];
  readonly optimistic: readonly number[];
  readonly conservative: readonly number[];
  readonly actual: readonly { readonly date: string; readonly kg: number; readonly trendKg: number }[];
  readonly todayIndex: number;
};

export type ChartModelInput = {
  readonly data: GoalChartData;
  readonly width: number;
  readonly height: number;
  readonly variant: GoalChartVariant;
  /** Fractional week where the expected line meets the target (ETA). `null` = full series. */
  readonly etaWeeks?: number | null;
  /** Pre-formatted label builders (copy lives in `content/goal.ts`). */
  readonly todayLabel?: (w: string) => string;
  readonly goalLabel?: (w: string) => string;
};

export type Pt = { readonly x: number; readonly y: number };
export type AxisLabel = { readonly x: number; readonly y: number; readonly text: string };

export type GoalChartModel = {
  readonly width: number;
  readonly height: number;
  readonly band: string | null;
  readonly expected: string | null;
  readonly expectedEnd: Pt | null;
  readonly trend: string | null;
  readonly dots: readonly Pt[];
  readonly target: { readonly y: number; readonly x1: number; readonly x2: number; readonly label: AxisLabel | null } | null;
  /** Label sits above the dot on a cut, beside it on a gain (the line climbs through "above"). */
  readonly todayDot: (Pt & { readonly label: AxisLabel | null }) | null;
  readonly todayLine: number | null;
  readonly yLabels: readonly AxisLabel[];
  readonly xLabels: readonly AxisLabel[];
};

/** Layout constants (Stitch S43: 326 × 150 viewBox, plot 20…115). */
export const CHART_PAD = {
  labeled: { left: 36, right: 8, top: 22, bottom: 30 },
  spark: { left: 4, right: 4, top: 4, bottom: 4 },
} as const;
/** Min px between month label centers (11 pt caps, ~25 pt wide + air). */
export const MONTH_GAP = 30;
/** Rough glyph width for 12 pt Space Grotesk labels (no text measuring in SVG). */
export const GLYPH_W = 6.6;

const r1 = (n: number) => Math.round(n * 10) / 10;

const pathOf = (pts: readonly Pt[], close = false): string | null => {
  if (pts.length === 0) return null;
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${r1(p.x)} ${r1(p.y)}`).join(" ");
  return close ? `${d} Z` : d;
};

/** Value at fractional index (linear), clamped to the series ends. */
export const sampleSeries = (s: readonly number[], t: number): number | null => {
  if (s.length === 0) return null;
  if (t <= 0) return s[0]!;
  if (t >= s.length - 1) return s[s.length - 1]!;
  const i = Math.floor(t);
  const f = t - i;
  return s[i]! + (s[i + 1]! - s[i]!) * f;
};

/** Mid-month labels (Stitch S43 spacing) between week 0 and `lastWeek`, thinned to `MONTH_GAP`. */
export const monthLabels = (
  start: string,
  lastWeek: number,
  xOf: (week: number) => number,
  y: number,
  /** Keeps the first label clear of the y-axis column. */
  minX = 0,
): AxisLabel[] => {
  const startDay = goalEngine.dayNumber(start);
  const endDay = startDay + Math.round(lastWeek * 7);
  const raw: AxisLabel[] = [];
  let [year, month] = start.split("-").map(Number) as [number, number];
  for (;;) {
    // The 15th, or the start date when the series begins after mid-month.
    const mid = Math.max(goalEngine.dayNumber(`${year}-${String(month).padStart(2, "0")}-15`), startDay);
    if (mid > endDay) break;
    raw.push({ x: Math.max(xOf((mid - startDay) / 7), raw.length ? 0 : minX), y, text: monthCaps(month) });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  if (raw.length <= 1) return raw;
  // Smallest even step (every 1, 2, 3… months) whose every gap clears MONTH_GAP.
  const fits = (s: number) => raw.every((l, i) => i < s || i % s !== 0 || l.x - raw[i - s]!.x >= MONTH_GAP);
  let step = 1;
  while (step < raw.length && !fits(step)) step += 1;
  return raw.filter((_, i) => i % step === 0);
};

export const buildGoalChartModel = (input: ChartModelInput): GoalChartModel => {
  const { data, variant } = input;
  const width = Math.max(1, input.width);
  const height = Math.max(1, input.height);
  const pad = variant === "spark" ? CHART_PAD.spark : CHART_PAD.labeled;
  const n = Math.max(data.planned.length, data.optimistic.length, data.conservative.length);
  const lastWeek = Math.max(1, n - 1);
  const actualKgs = data.actual.flatMap((a) => [a.kg, a.trendKg]);
  const all = [...data.planned, ...data.optimistic, ...data.conservative, ...actualKgs];
  if (data.targetKg !== null) all.push(data.targetKg);

  const empty: GoalChartModel = {
    width, height, band: null, expected: null, expectedEnd: null, trend: null, dots: [],
    target: null, todayDot: null, todayLine: null, yLabels: [], xLabels: [],
  };
  if (all.length === 0) return empty;

  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const span = hi - lo || 1;
  const plotW = Math.max(1, width - pad.left - pad.right);
  const plotH = Math.max(1, height - pad.top - pad.bottom);
  const xOf = (week: number) => pad.left + (Math.min(Math.max(week, 0), lastWeek) / lastWeek) * plotW;
  const yOf = (kg: number) => (hi === lo ? pad.top + plotH / 2 : pad.top + ((hi - kg) / span) * plotH);
  const labeled = variant !== "spark";

  const opt = data.optimistic.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
  const cons = data.conservative.map((v, i) => ({ x: xOf(i), y: yOf(v) })).reverse();
  const band = opt.length && cons.length ? pathOf([...opt, ...cons], true) : null;

  const end = input.etaWeeks != null ? Math.min(input.etaWeeks, lastWeek) : data.planned.length - 1;
  const exp: Pt[] = [];
  for (let i = 0; i < data.planned.length && i <= end; i += 1) exp.push({ x: xOf(i), y: yOf(data.planned[i]!) });
  if (input.etaWeeks != null && end > Math.floor(end) && data.planned.length) {
    const kg = data.targetKg ?? sampleSeries(data.planned, end)!;
    exp.push({ x: xOf(end), y: yOf(kg) });
  }
  const expectedEnd = input.etaWeeks != null && exp.length > 1 ? exp[exp.length - 1]! : null;

  const weekOfDate = (iso: string) => goalEngine.diffDays(iso, data.start) / 7;
  const dots = data.actual.map((a) => ({ x: xOf(weekOfDate(a.date)), y: yOf(a.kg) }));
  const trend = data.actual.length > 1
    ? pathOf(data.actual.map((a) => ({ x: xOf(weekOfDate(a.date)), y: yOf(a.trendKg) })))
    : null;

  const startKg = data.planned[0] ?? data.actual[0]?.trendKg ?? null;
  const fmt = (kg: number) => weightNumber(kg, data.unit);
  let target: GoalChartModel["target"] = null;
  if (data.targetKg !== null) {
    const ty = yOf(data.targetKg);
    const text = labeled && input.goalLabel ? input.goalLabel(`${fmt(data.targetKg)} ${data.unit}`) : null;
    const labelW = text ? text.length * GLYPH_W : 0;
    const x2 = text ? width - labelW - 4 : width - pad.right;
    target = { y: ty, x1: labeled ? pad.left - 4 : 0, x2, label: text ? { x: width, y: ty + 4, text } : null };
  }

  const todayDot = labeled && startKg !== null && data.todayIndex === 0
    ? {
        x: xOf(0),
        y: yOf(startKg),
        label: input.todayLabel
          ? data.targetKg !== null && data.targetKg > startKg
            ? { x: xOf(0) + 10, y: yOf(startKg) + 4, text: input.todayLabel(`${fmt(startKg)} ${data.unit}`) }
            : { x: xOf(0), y: Math.max(10, yOf(startKg) - 10), text: input.todayLabel(`${fmt(startKg)} ${data.unit}`) }
          : null,
      }
    : null;
  const todayLine = variant === "full" && data.todayIndex > 0 ? xOf(data.todayIndex) : null;

  const yLabels: AxisLabel[] = [];
  if (labeled && startKg !== null) {
    yLabels.push({ x: pad.left - 12, y: yOf(startKg) + 4, text: fmt(startKg) });
    if (data.targetKg !== null && fmt(data.targetKg) !== fmt(startKg)) {
      yLabels.push({ x: pad.left - 12, y: yOf(data.targetKg) + 4, text: fmt(data.targetKg) });
    }
  }
  const xLabels = labeled ? monthLabels(data.start, lastWeek, xOf, height - 5, pad.left + 10) : [];

  return { width, height, band, expected: pathOf(exp), expectedEnd, trend, dots, target, todayDot, todayLine, yLabels, xLabels };
};

