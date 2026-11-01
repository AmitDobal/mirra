import { and, eq, gte, lt } from "drizzle-orm";

import type { AppDB } from "../db";
import { setLogs, workoutSessions, workouts } from "../db/schema";
import { toDateString } from "../lib/dates";

/** Guards against sessions left open overnight skewing minutes. */
const MAX_SESSION_MINUTES = 240;

export type SessionStat = {
  id: string;
  workoutId: string | null;
  title: string | null;
  startedAt: number;
  endedAt: number | null;
  rpe: number | null;
  notes: string | null;
  /** UTC calendar day the session started on. */
  date: string;
  minutes: number;
  setsCompleted: number;
  volumeKg: number;
};

const minutesBetween = (startedAt: number, endedAt: number | null): number => {
  if (endedAt == null) return 0;
  return Math.min(MAX_SESSION_MINUTES, Math.max(0, Math.round((endedAt - startedAt) / 60_000)));
};

/** Sessions started in [startMs, endMs) with minutes, completed sets and volume (kg x reps). */
export const loadSessionStats = async (
  db: AppDB,
  userId: string,
  startMs: number,
  endMs: number,
): Promise<SessionStat[]> => {
  const inRange = and(
    eq(workoutSessions.userId, userId),
    gte(workoutSessions.startedAt, new Date(startMs)),
    lt(workoutSessions.startedAt, new Date(endMs)),
  );
  const sessions = await db
    .select({ s: workoutSessions, title: workouts.title })
    .from(workoutSessions)
    .leftJoin(workouts, eq(workoutSessions.workoutId, workouts.id))
    .where(inRange);
  const sets = await db
    .select({
      sessionId: setLogs.sessionId,
      weightKg: setLogs.weightKg,
      reps: setLogs.reps,
    })
    .from(setLogs)
    .innerJoin(workoutSessions, eq(setLogs.sessionId, workoutSessions.id))
    .where(and(inRange, eq(setLogs.completed, true)));

  const totals = new Map<string, { sets: number; volume: number }>();
  for (const row of sets) {
    const t = totals.get(row.sessionId) ?? { sets: 0, volume: 0 };
    t.sets += 1;
    t.volume += (row.weightKg ?? 0) * (row.reps ?? 0);
    totals.set(row.sessionId, t);
  }

  return sessions
    .map(({ s, title }) => {
      const t = totals.get(s.id);
      const startedAt = s.startedAt.getTime();
      const endedAt = s.endedAt ? s.endedAt.getTime() : null;
      return {
        id: s.id,
        workoutId: s.workoutId,
        title,
        startedAt,
        endedAt,
        rpe: s.rpe,
        notes: s.notes,
        date: toDateString(s.startedAt),
        minutes: minutesBetween(startedAt, endedAt),
        setsCompleted: t?.sets ?? 0,
        volumeKg: Math.round((t?.volume ?? 0) * 10) / 10,
      };
    })
    .sort((a, b) => b.startedAt - a.startedAt);
};
