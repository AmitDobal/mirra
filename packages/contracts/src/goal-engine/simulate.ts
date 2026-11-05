/**
 * §3 weekly stepper: w ← w ∓ clamp(pct × w, minKg, maxKg). Rates apply to the
 * projected weight each week, so they taper. The crossing week is fractional.
 */
import { clamp } from "./rates";
import type { GoalDirection } from "./types";

export const MAX_WEEKS = 104;
export const HORIZON_WEEKS = 12;

export type SimInput = {
  w0: number;
  /** Fraction of the current weight per week (> 0). */
  pct: number;
  direction: GoalDirection;
  /** null → run a fixed `maxWeeks` line (horizon mode). */
  targetKg: number | null;
  minKg: number;
  maxKg: number;
  maxWeeks?: number;
};

export type SimResult = {
  /** Weekly weights from w0; the last point is the target when reached. */
  points: number[];
  /** Fractional weeks to the target; null when not reached within `maxWeeks`. */
  weeks: number | null;
  reached: boolean;
};

const passed = (w: number, target: number, sign: number) => (sign < 0 ? w <= target : w >= target);

export const simulate = (s: SimInput): SimResult => {
  const maxWeeks = s.maxWeeks ?? MAX_WEEKS;
  const points = [s.w0];
  if (s.direction === "hold") {
    for (let i = 1; i <= maxWeeks; i += 1) points.push(s.w0);
    return { points, weeks: null, reached: false };
  }
  const sign = s.direction === "down" ? -1 : 1;
  if (s.targetKg !== null && passed(s.w0, s.targetKg, sign)) return { points, weeks: 0, reached: true };

  let w = s.w0;
  for (let i = 1; i <= maxWeeks; i += 1) {
    const step = clamp(s.pct * w, s.minKg, s.maxKg);
    if (step <= 0) break;
    const next = w + sign * step;
    if (s.targetKg !== null && passed(next, s.targetKg, sign)) {
      const frac = Math.abs(s.targetKg - w) / step;
      points.push(s.targetKg);
      return { points, weeks: i - 1 + frac, reached: true };
    }
    points.push(next);
    w = next;
  }
  return { points, weeks: null, reached: false };
};

/** Weight at fractional week `t` along a simulated line (holds the last point). */
export const sampleAt = (points: readonly number[], t: number): number => {
  if (points.length === 0) return NaN;
  if (t <= 0) return points[0]!;
  const i = Math.floor(t);
  if (i >= points.length - 1) return points[points.length - 1]!;
  const a = points[i]!;
  const b = points[i + 1]!;
  return a + (b - a) * (t - i);
};
