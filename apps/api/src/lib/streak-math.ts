import type { StreakFireState } from "@mirra/contracts";

import { addDays } from "./dates";

/** Check-ins are looked up at most this many days back; streaks longer than this cap at the lookback. */
export const STREAK_LOOKBACK_DAYS = 400;

/** Consecutive days present in `counted`, walking back from `from` (inclusive). */
export const runLength = (counted: ReadonlySet<string>, from: string): number => {
  let run = 0;
  let cursor = from;
  for (let i = 0; i < STREAK_LOOKBACK_DAYS; i++) {
    if (!counted.has(cursor)) break;
    run += 1;
    cursor = addDays(cursor, -1);
  }
  return run;
};

export type StreakCompute = {
  readonly current: number;
  readonly lastActiveDate: string | null;
};

/**
 * Streak as of `today`. A streak stays alive through yesterday (today is still open), so the run
 * is anchored on today when counted, else on yesterday. Days after `today` never count.
 */
export const computeStreak = (dates: Iterable<string>, today: string): StreakCompute => {
  const counted = new Set<string>();
  let lastActiveDate: string | null = null;
  for (const d of dates) {
    if (d > today) continue;
    counted.add(d);
    if (lastActiveDate === null || d > lastActiveDate) lastActiveDate = d;
  }
  const anchor = counted.has(today) ? today : addDays(today, -1);
  return { current: runLength(counted, anchor), lastActiveDate };
};

export type StreakRowView = {
  readonly currentCount: number;
  readonly bestCount: number;
  readonly lastActiveDate: string | null;
};

/** Read-time view of a cached row: a row older than yesterday is a broken streak (0, cold). */
export const viewStreak = (
  row: StreakRowView,
  today: string,
): { current: number; fire: StreakFireState } => {
  if (row.lastActiveDate === today) return { current: row.currentCount, fire: "lit" };
  if (row.lastActiveDate === addDays(today, -1) && row.currentCount > 0) {
    return { current: row.currentCount, fire: "at_risk" };
  }
  return { current: 0, fire: "cold" };
};
