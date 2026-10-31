import type { HistoryStats } from "@mirra/contracts";
import { and, desc, eq, gte, lt } from "drizzle-orm";

import type { AppDB } from "../db";
import { checkIns, meals, workoutSessions } from "../db/schema";
import { addDays, dayBoundsMs, toDateString } from "../lib/dates";
import { MAX_HISTORY_WINDOW_DAYS } from "./user-tenure";

const STREAK_LOOKBACK = MAX_HISTORY_WINDOW_DAYS;

export type HistorySummary = HistoryStats & {
  missedYesterday: boolean;
  checkedInYesterday: boolean;
  priorStreak: number;
  /** One short line for the LLM. Never contains meal names. */
  text: string;
};

export type PlannedDay = { date: string; workoutId: string | null };

const toMs = (v: Date | number): number => (v instanceof Date ? v.getTime() : Number(v));
const dateOf = (v: Date | number): string => toDateString(new Date(toMs(v)));

const pct = (value: number, target: number): number =>
  Math.round(((value - target) / Math.max(1, target)) * 100);

const signed = (n: number): string => (n > 0 ? `+${n}` : `${n}`);

/** Consecutive counted check-in days walking back from `from` (inclusive). */
const streakFrom = (counted: Set<string>, from: string): number => {
  let streak = 0;
  let cursor = from;
  for (let i = 0; i < STREAK_LOOKBACK; i++) {
    if (!counted.has(cursor)) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
};

const buildText = (s: HistoryStats, kcalTarget: number): string => {
  const fuel =
    s.avgKcal == null || s.avgKcalDeltaPct == null
      ? "no meals logged"
      : `avg ${s.avgKcal} kcal vs ${kcalTarget} (${signed(s.avgKcalDeltaPct)}%) over ${s.loggedDays} logged days`;
  const lifts = s.plannedSessions
    ? `lifts missed ${s.missedSessions}/${s.plannedSessions}`
    : "no lifts planned";
  const recent = s.lastCheckIns.length
    ? s.lastCheckIns.map((c) => `${c.date.slice(5)} ${c.status}`).join(", ")
    : "none";
  return `${s.windowDays ?? 7}d: ${fuel}; ${lifts}; streak ${s.streakDays}d; check-ins: ${recent}`;
};

/**
 * Aggregated history (`windowDays`, default 7, max 21) ending yesterday (today is partial, so it is excluded
 * from averages/misses). Meals are reduced to per-day totals; names never leave here.
 */
export const buildHistorySummary = async (
  db: AppDB,
  userId: string,
  localDate: string,
  opts: { kcalTarget: number; plannedDays: PlannedDay[]; windowDays?: number },
): Promise<HistorySummary> => {
  const windowDays = Math.min(
    MAX_HISTORY_WINDOW_DAYS,
    Math.max(1, Math.floor(opts.windowDays ?? 7)),
  );
  const windowStart = addDays(localDate, -windowDays);
  const yesterday = addDays(localDate, -1);
  const from = new Date(dayBoundsMs(windowStart).start);
  const to = new Date(dayBoundsMs(localDate).start);

  const [mealRows, sessionRows, checkInRows] = await Promise.all([
    db
      .select({ eatenAt: meals.eatenAt, kcal: meals.kcal })
      .from(meals)
      .where(and(eq(meals.userId, userId), gte(meals.eatenAt, from), lt(meals.eatenAt, to))),
    db
      .select({ startedAt: workoutSessions.startedAt, endedAt: workoutSessions.endedAt })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          gte(workoutSessions.startedAt, from),
          lt(workoutSessions.startedAt, to),
        ),
      ),
    db
      .select({ localDate: checkIns.localDate, status: checkIns.status })
      .from(checkIns)
      .where(eq(checkIns.userId, userId))
      .orderBy(desc(checkIns.localDate))
      .limit(STREAK_LOOKBACK),
  ]);

  const kcalByDay = new Map<string, number>();
  for (const m of mealRows) {
    const key = dateOf(m.eatenAt);
    kcalByDay.set(key, (kcalByDay.get(key) ?? 0) + m.kcal);
  }
  const loggedDays = kcalByDay.size;
  const totalKcal = [...kcalByDay.values()].reduce((a, b) => a + b, 0);
  const avgKcal = loggedDays ? Math.round(totalKcal / loggedDays) : null;

  const sessionDays = new Set(
    sessionRows.filter((s) => s.endedAt != null).map((s) => dateOf(s.startedAt)),
  );
  const plannedInWindow = opts.plannedDays.filter(
    (d) => d.workoutId != null && d.date >= windowStart && d.date < localDate,
  );
  const missed = plannedInWindow.filter((d) => !sessionDays.has(d.date));

  const counted = new Set(
    checkInRows.filter((c) => c.status !== "skipped").map((c) => c.localDate),
  );
  const checkedInToday = counted.has(localDate);
  const checkedInYesterday = counted.has(yesterday);
  const streakDays = streakFrom(counted, checkedInToday ? localDate : yesterday);
  const priorStreak = checkedInYesterday ? 0 : streakFrom(counted, addDays(localDate, -2));

  const stats: HistoryStats = {
    windowDays,
    loggedDays,
    avgKcal,
    avgKcalDeltaPct: avgKcal == null ? null : pct(avgKcal, opts.kcalTarget),
    plannedSessions: plannedInWindow.length,
    missedSessions: missed.length,
    streakDays,
    lastCheckIns: checkInRows
      .slice(0, 3)
      .map((c) => ({ date: c.localDate, status: c.status })),
  };

  return {
    ...stats,
    missedYesterday: missed.some((d) => d.date === yesterday),
    checkedInYesterday,
    priorStreak,
    text: buildText(stats, opts.kcalTarget),
  };
};
