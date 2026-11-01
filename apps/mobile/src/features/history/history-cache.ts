import type { HistoryRange, WorkoutSummary } from "@/lib/api";

import type { HistoryDay } from "./history-model";

/** History API responses are reused for one hour; pull-to-refresh bypasses this. */
export const HISTORY_TTL_MS = 60 * 60 * 1000;

export type HistoryCacheEntry = {
  readonly days: readonly HistoryDay[];
  readonly workouts: WorkoutSummary | null;
  /** Epoch ms of the last successful network fetch for this range + anchor. */
  readonly fetchedAt: number;
};

export const historyCacheKey = (range: HistoryRange, anchor: string): string => `${range}|${anchor}`;

/** True when `fetchedAt` is set and younger than the TTL (clock skew counts as stale). */
export const isFresh = (
  fetchedAt: number | null | undefined,
  now: number = Date.now(),
  ttlMs: number = HISTORY_TTL_MS,
): boolean => fetchedAt != null && now >= fetchedAt && now - fetchedAt < ttlMs;

/** A cache entry is reusable only if it is fresh and actually holds a series. */
export const isUsableEntry = (
  entry: HistoryCacheEntry | undefined,
  now: number = Date.now(),
): entry is HistoryCacheEntry => entry !== undefined && entry.days.length > 0 && isFresh(entry.fetchedAt, now);
