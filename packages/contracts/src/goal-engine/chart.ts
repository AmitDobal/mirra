/**
 * §5 chart series: weekly points from the start date. Before today the band
 * collapses onto the start→trend line; after today it fans out from the trend.
 */
import { round } from "./rates";
import { sampleAt } from "./simulate";
import type { GoalChart, GoalUnits, IsoDate, TrendPoint } from "./types";

export const CHART_MAX_POINTS = 105;
export const CHART_MAX_ACTUAL = 120;

export type ChartInput = {
  startDate: IsoDate;
  daysSinceStart: number;
  units: GoalUnits;
  startKg: number | null;
  currentKg: number | null;
  targetKg: number | null;
  plannedLine: readonly number[];
  /** Simulated weekly lines from today's weight (week 0 = today). */
  optimistic: readonly number[];
  conservative: readonly number[];
  /** ± kg for `hold` (milestones mode); upper → optimistic, lower → conservative. */
  holdBandKg: number | null;
  futureWeeks: number;
  points: readonly TrendPoint[];
};

export const buildChart = (c: ChartInput): GoalChart | null => {
  if (c.startKg === null || c.currentKg === null) return null;
  const startKg = c.startKg;
  const currentKg = c.currentKg;
  const todayIdx = c.daysSinceStart / 7;
  const n = Math.min(CHART_MAX_POINTS, Math.max(c.plannedLine.length, Math.ceil(todayIdx + c.futureWeeks) + 1));
  const planned: number[] = [];
  const optimistic: number[] = [];
  const conservative: number[] = [];
  const lastPlanned = c.plannedLine[c.plannedLine.length - 1] ?? startKg;
  for (let i = 0; i < n; i += 1) {
    planned.push(round(c.plannedLine[i] ?? lastPlanned));
    if (c.holdBandKg !== null) {
      optimistic.push(round(startKg + c.holdBandKg));
      conservative.push(round(startKg - c.holdBandKg));
      continue;
    }
    const t = i - todayIdx;
    if (t <= 0) {
      const v = todayIdx > 0 ? startKg + (currentKg - startKg) * (i / todayIdx) : currentKg;
      optimistic.push(round(v));
      conservative.push(round(v));
    } else {
      optimistic.push(round(sampleAt(c.optimistic, t)));
      conservative.push(round(sampleAt(c.conservative, t)));
    }
  }
  const actual = c.points
    .slice(-CHART_MAX_ACTUAL)
    .map((p) => ({ date: p.date, kg: round(p.kg), trendKg: round(p.trendKg) }));
  return {
    start: c.startDate,
    unit: c.units === "imperial" ? "lb" : "kg",
    targetKg: c.targetKg === null ? null : round(c.targetKg),
    planned,
    optimistic,
    conservative,
    actual,
    todayIndex: round(todayIdx),
  };
};
