/**
 * §3 band rates (kg/week at the current trend weight).
 *
 * Spreads are pinned so that on day 0 (prior M = 0.85, w = 0) optimistic equals
 * the pace rate and conservative equals 0.6 × the pace rate, as §3 states. The
 * doc's rounded constants (0.18 / 0.30) land 1–2 days off its own worked example.
 */
import { M_PRIOR } from "./adherence";
import { BAND_MIN_KG } from "./rates";

/** 1/0.85 − 1 ≈ 0.176 (doc: 0.18). */
export const OPTIMISTIC_SPREAD = 1 / M_PRIOR - 1;
/** 1 − 0.6/0.85 ≈ 0.294 (doc: 0.30). */
export const CONSERVATIVE_SPREAD = 1 - 0.6 / M_PRIOR;
/** Trend weight w = min(0.8, spanDays / 35). */
export const TREND_WEIGHT_MAX = 0.8;
export const TREND_WEIGHT_DAYS = 35;

export const trendWeight = (valid: boolean, spanDays: number) =>
  valid ? Math.min(TREND_WEIGHT_MAX, spanDays / TREND_WEIGHT_DAYS) : 0;

export type BandRates = { plan: number; expected: number; optimistic: number; conservative: number };

/**
 * @param paceKg  §2 pace rate (full adherence)
 * @param multiplier  M(A)
 * @param w  trend weight
 * @param observedKg  observed rate in the goal direction, already clamped to [0, maxKg]
 */
export const bandRates = (paceKg: number, multiplier: number, w: number, observedKg: number, maxKg: number): BandRates => {
  if (paceKg <= 0) return { plan: 0, expected: 0, optimistic: 0, conservative: 0 };
  const plan = paceKg * multiplier;
  // Floored like conservative so the band stays ordered when the trend stalls.
  const expected = Math.max(BAND_MIN_KG, (1 - w) * plan + w * observedKg);
  const optimistic = Math.max(expected, Math.min(maxKg, expected * (1 + OPTIMISTIC_SPREAD * (1 - w / 2))));
  const conservative = Math.min(expected, Math.max(BAND_MIN_KG, expected * (1 - CONSERVATIVE_SPREAD * (1 - w / 2))));
  return { plan, expected, optimistic, conservative };
};
