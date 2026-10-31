import type { WeightEntry } from "./weight-store";

export type WeightStats = {
  readonly latestKg: number | null;
  /** latest − first of the series (negative = lost). */
  readonly deltaFromFirstKg: number | null;
  /** latest − goal (negative = below goal). */
  readonly deltaToGoalKg: number | null;
  /** Oldest → newest, for charting. */
  readonly series: readonly number[];
};

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** `entries` is newest first (store order). */
export const computeWeightStats = (
  entries: readonly WeightEntry[],
  goalKg: number | null,
): WeightStats => {
  const series = [...entries].reverse().map((e) => e.kg);
  const latest = series[series.length - 1];
  const first = series[0];
  if (latest === undefined || first === undefined) {
    return { latestKg: null, deltaFromFirstKg: null, deltaToGoalKg: null, series };
  }
  return {
    latestKg: latest,
    deltaFromFirstKg: series.length >= 2 ? round1(latest - first) : null,
    deltaToGoalKg: goalKg === null ? null : round1(latest - goalKg),
    series,
  };
};

export const formatKg = (kg: number): string => `${round1(kg)} kg`;

/** "-1.2 kg" / "+0.4 kg" / "0 kg". */
export const formatDelta = (delta: number): string =>
  delta === 0 ? "0 kg" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} kg`;

/** Parse user text ("77,9" or "77.9"); null when not a number. */
export const parseKgInput = (raw: string): number | null => {
  const n = Number(raw.trim().replace(",", "."));
  return raw.trim() !== "" && Number.isFinite(n) ? n : null;
};
