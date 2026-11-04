/**
 * §3 adherence A ∈ [0,1] over the last 28 days (or since start), and M(A).
 */
import { dayNumber } from "./dates";
import type { FuelDay, GoalAdherence, GoalLever, GoalType, IsoDate, SessionDay } from "./types";

export const ADHERENCE_WINDOW_DAYS = 28;
export const ADHERENCE_MIN_DAYS = 7;
export const FUEL_MIN_LOGGED = 7;
export const A_PRIOR = 0.625;

/** M(A) = 0.6 + 0.4·A. Prior M = 0.85; full adherence M = 1. */
export const adherenceMultiplier = (a: number) => 0.6 + 0.4 * Math.min(1, Math.max(0, a));
export const M_PRIOR = adherenceMultiplier(A_PRIOR);

type Weights = Record<GoalLever, number>;
const WEIGHTS: Record<"fat_loss" | "muscle_gain" | "other", Weights> = {
  fat_loss: { training: 0.3, fuel: 0.5, check_in: 0.2 },
  muscle_gain: { training: 0.5, fuel: 0.35, check_in: 0.15 },
  other: { training: 0.5, fuel: 0.3, check_in: 0.2 },
};
const weightsFor = (g: GoalType): Weights => (g === "fat_loss" || g === "muscle_gain" ? WEIGHTS[g] : WEIGHTS.other);

export type AdherenceInput = {
  goalType: GoalType;
  startDate: IsoDate;
  today: IsoDate;
  sessions?: readonly SessionDay[];
  fuelDays?: readonly FuelDay[];
  checkInDates?: readonly IsoDate[];
};

/** Window [from, to] in day numbers: last 28 days ending today, never before start. */
export const adherenceWindow = (startDate: IsoDate, today: IsoDate): { from: number; to: number; days: number } => {
  const to = dayNumber(today);
  const from = Math.max(dayNumber(startDate), to - (ADHERENCE_WINDOW_DAYS - 1));
  return { from, to, days: Math.max(0, to - from + 1) };
};

export const computeAdherence = (a: AdherenceInput): GoalAdherence => {
  const { from, to, days } = adherenceWindow(a.startDate, a.today);
  const inWin = (d: IsoDate) => {
    const n = dayNumber(d);
    return n >= from && n <= to;
  };
  const sessions = (a.sessions ?? []).filter((s) => inWin(s.date));
  const fuel = (a.fuelDays ?? []).filter((f) => inWin(f.date));
  const checkInDays = new Set((a.checkInDates ?? []).filter(inWin)).size;

  const training = { done: sessions.filter((s) => s.done).length, planned: sessions.length };
  const fuelCounts = fuel.length > 0 ? { onTarget: fuel.filter((f) => f.onTarget).length, logged: fuel.length } : null;
  const checkIn = { days: Math.min(checkInDays, days), of: days };

  const values: Record<GoalLever, number | null> = {
    training: training.planned > 0 ? Math.min(1, training.done / training.planned) : null,
    fuel: fuelCounts && fuelCounts.logged >= FUEL_MIN_LOGGED ? fuelCounts.onTarget / fuelCounts.logged : null,
    check_in: days > 0 ? checkIn.days / days : null,
  };
  const w = weightsFor(a.goalType);
  const levers = (Object.keys(w) as GoalLever[]).filter((k) => values[k] !== null);
  const prior = days < ADHERENCE_MIN_DAYS || levers.length === 0;

  let score = A_PRIOR;
  if (!prior) {
    const wSum = levers.reduce((s, k) => s + w[k], 0);
    score = levers.reduce((s, k) => s + w[k] * values[k]!, 0) / wSum;
  }
  // Lever = biggest weighted gap; with no data, the heaviest component.
  const order: GoalLever[] = ["training", "fuel", "check_in"];
  let lever: GoalLever = order.reduce((best, k) => (w[k] > w[best] ? k : best), "training" as GoalLever);
  if (!prior) {
    let bestGap = -1;
    for (const k of order) {
      const v = values[k];
      const gap = v === null ? -1 : w[k] * (1 - v);
      if (gap > bestGap) {
        bestGap = gap;
        lever = k;
      }
    }
  }
  return {
    score,
    multiplier: adherenceMultiplier(score),
    prior,
    training: values.training,
    fuel: values.fuel,
    checkIn: values.check_in,
    counts: { training, fuel: fuelCounts, checkIn },
    lever,
  };
};
