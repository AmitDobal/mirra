import type { WorkoutHistorySession, WorkoutSummaryResponse } from "@mirra/contracts";

import type { AppDB } from "../db";
import { addDays } from "../lib/dates";
import { historyWindow, windowBoundsMs, type HistoryRange } from "../lib/history-window";
import { loadSessionStats, type SessionStat } from "./workout-stats";

const DEFAULT_HISTORY_DAYS = 30;

export const toHistorySession = (s: SessionStat): WorkoutHistorySession => ({
  id: s.id,
  workoutId: s.workoutId,
  title: s.title,
  startedAt: s.startedAt,
  endedAt: s.endedAt,
  rpe: s.rpe,
  notes: s.notes,
  minutes: s.minutes,
  setsCompleted: s.setsCompleted,
  volumeKg: s.volumeKg,
});

/** Sessions started between `from` and `to` (inclusive days, UTC). Defaults to the last 30 days. */
export const loadWorkoutHistory = async (
  db: AppDB,
  userId: string,
  today: string,
  query: { from?: string; to?: string },
) => {
  const to = query.to ?? today;
  const from = query.from ?? addDays(to, -(DEFAULT_HISTORY_DAYS - 1));
  const { start, end } = windowBoundsMs({ from, to });
  const stats = (await loadSessionStats(db, userId, start, end)).slice(0, 200);
  return { from, to, items: stats.map(toHistorySession) };
};

export const loadWorkoutSummary = async (
  db: AppDB,
  userId: string,
  range: HistoryRange,
  anchor: string,
): Promise<WorkoutSummaryResponse> => {
  const window = historyWindow(range, anchor);
  const { start, end } = windowBoundsMs(window);
  const done = (await loadSessionStats(db, userId, start, end)).filter((s) => s.endedAt != null);

  const series = window.dates.map((date) => {
    const day = done.filter((s) => s.date === date);
    return {
      date,
      sessions: day.length,
      minutes: day.reduce((a, s) => a + s.minutes, 0),
      setsCompleted: day.reduce((a, s) => a + s.setsCompleted, 0),
      volumeKg: Math.round(day.reduce((a, s) => a + s.volumeKg, 0) * 10) / 10,
    };
  });

  return {
    range,
    anchor,
    from: window.from,
    to: window.to,
    series,
    totals: {
      sessions: done.length,
      minutes: series.reduce((a, d) => a + d.minutes, 0),
      setsCompleted: series.reduce((a, d) => a + d.setsCompleted, 0),
      volumeKg: Math.round(series.reduce((a, d) => a + d.volumeKg, 0) * 10) / 10,
    },
  };
};
