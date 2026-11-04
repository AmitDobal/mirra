/**
 * §3 trend: time-aware EWMA on raw weigh-ins (Hacker's Diet style) and the
 * least-squares slope of the trend over the last 28 days.
 */
import { dayNumber, fromDayNumber } from "./dates";
import type { GoalDirection, GoalTrend, IsoDate, TrendPoint, WeightLog } from "./types";

export const EWMA_BASE = 0.9;
export const SLOPE_WINDOW_DAYS = 28;
export const REVERSAL_DAYS = 21;
export const TREND_MIN_LOGS = 3;
export const TREND_MIN_SPAN_DAYS = 14;
/** Slopes smaller than this (kg/wk) count as flat, not reversed. */
const REVERSAL_EPS_KG_WK = 0.05;

/** One value per day (same-day weigh-ins averaged), inside [start, today], sorted. */
const dailyLogs = (logs: readonly WeightLog[], startDate: IsoDate, today: IsoDate): { day: number; kg: number }[] => {
  const lo = dayNumber(startDate);
  const hi = dayNumber(today);
  const byDay = new Map<number, { sum: number; n: number }>();
  for (const l of logs) {
    if (!Number.isFinite(l.kg) || l.kg <= 0) continue;
    const d = dayNumber(l.date);
    if (d < lo || d > hi) continue;
    const cur = byDay.get(d) ?? { sum: 0, n: 0 };
    cur.sum += l.kg;
    cur.n += 1;
    byDay.set(d, cur);
  }
  return [...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([day, v]) => ({ day, kg: v.sum / v.n }));
};

/** Least-squares slope (kg/week) of points with `day ≥ fromDay`; null with < 2 distinct days. */
const slopeSince = (pts: readonly { day: number; trendKg: number }[], fromDay: number): { slope: number | null; span: number } => {
  const w = pts.filter((p) => p.day >= fromDay);
  if (w.length < 2) return { slope: null, span: 0 };
  const n = w.length;
  const mx = w.reduce((s, p) => s + p.day, 0) / n;
  const my = w.reduce((s, p) => s + p.trendKg, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of w) {
    num += (p.day - mx) * (p.trendKg - my);
    den += (p.day - mx) ** 2;
  }
  const span = w[n - 1]!.day - w[0]!.day;
  return { slope: den > 0 ? (num / den) * 7 : null, span };
};

export const computeTrend = (logs: readonly WeightLog[], startDate: IsoDate, today: IsoDate): GoalTrend => {
  const days = dailyLogs(logs, startDate, today);
  if (days.length === 0) {
    return { points: [], trendKg: null, slopeKgWk: null, slope21KgWk: null, spanDays: 0, valid: false };
  }
  const pts: { day: number; kg: number; trendKg: number }[] = [];
  let t = days[0]!.kg;
  let prev = days[0]!.day;
  for (const d of days) {
    const alpha = 1 - EWMA_BASE ** (d.day - prev);
    t += alpha * (d.kg - t);
    prev = d.day;
    pts.push({ day: d.day, kg: d.kg, trendKg: t });
  }
  const todayN = dayNumber(today);
  const spanDays = pts[pts.length - 1]!.day - pts[0]!.day;
  const valid = pts.length >= TREND_MIN_LOGS && spanDays >= TREND_MIN_SPAN_DAYS;
  const s28 = slopeSince(pts, todayN - (SLOPE_WINDOW_DAYS - 1));
  const s21 = slopeSince(pts, todayN - REVERSAL_DAYS);
  const points: TrendPoint[] = pts.map((p) => ({ date: fromDayNumber(p.day), kg: p.kg, trendKg: p.trendKg }));
  return {
    points,
    trendKg: t,
    slopeKgWk: valid ? s28.slope : null,
    // Reversal needs the 21-day window mostly covered by weigh-ins.
    slope21KgWk: valid && s21.span >= TREND_MIN_SPAN_DAYS ? s21.slope : null,
    spanDays,
    valid,
  };
};

/** §3 "moving the wrong way": 28- and 21-day slopes both oppose the goal direction. */
export const isTrendReversed = (trend: GoalTrend, direction: GoalDirection): boolean => {
  if (direction === "hold" || !trend.valid || trend.slopeKgWk === null || trend.slope21KgWk === null) return false;
  const sign = direction === "down" ? -1 : 1;
  return sign * trend.slopeKgWk < -REVERSAL_EPS_KG_WK && sign * trend.slope21KgWk < -REVERSAL_EPS_KG_WK;
};

/** First trend point at or past `kg` in the goal direction. */
export const firstCrossing = (points: readonly TrendPoint[], kg: number, direction: GoalDirection): IsoDate | null => {
  if (direction === "hold") return null;
  const hit = points.find((p) => (direction === "down" ? p.trendKg <= kg : p.trendKg >= kg));
  return hit ? hit.date : null;
};
