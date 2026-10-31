import type { HistoryDayResponse } from "@mirra/contracts";
import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";

import type { AppDB } from "../db";
import {
  attendanceDay,
  checkIns,
  setLogs,
  weightLogs,
  workoutSessions,
} from "../db/schema";
import { dayBoundsMs, msToUnix } from "../lib/dates";
import { attendanceState } from "./attendance";
import { loadHydration } from "./hydration";
import { loadDayMeals } from "./meals";
import { loadCurrentPlan } from "./plan-loaders";

/** Compact read of one day, composed from existing tables. Every query filters by `userId`. */
export const loadDayHistory = async (
  db: AppDB,
  userId: string,
  date: string,
): Promise<HistoryDayResponse> => {
  const { start, end } = dayBoundsMs(date);
  const [presence, dayMeals, hydration, sessions, checkIn, weight, current] =
    await Promise.all([
      db
        .select()
        .from(attendanceDay)
        .where(
          and(
            eq(attendanceDay.userId, userId),
            eq(attendanceDay.localDate, date),
          ),
        )
        .limit(1),
      loadDayMeals(db, userId, date),
      loadHydration(db, userId, date),
      db
        .select({
          id: workoutSessions.id,
          workoutId: workoutSessions.workoutId,
          endedAt: workoutSessions.endedAt,
        })
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.userId, userId),
            gte(workoutSessions.startedAt, new Date(start)),
            lt(workoutSessions.startedAt, new Date(end)),
          ),
        ),
      db
        .select({ status: checkIns.status, note: checkIns.note })
        .from(checkIns)
        .where(and(eq(checkIns.userId, userId), eq(checkIns.localDate, date)))
        .limit(1),
      db
        .select({ kg: weightLogs.kg })
        .from(weightLogs)
        .where(
          and(
            eq(weightLogs.userId, userId),
            gte(weightLogs.loggedAt, new Date(start)),
            lt(weightLogs.loggedAt, new Date(end)),
          ),
        )
        .orderBy(desc(weightLogs.loggedAt))
        .limit(1),
      loadCurrentPlan(db, userId),
    ]);

  const done = sessions.filter((s) => s.endedAt != null);
  const sessionIds = done.map((s) => s.id);
  const setRows = sessionIds.length
    ? await db
        .select({ id: setLogs.id })
        .from(setLogs)
        .where(
          and(
            inArray(setLogs.sessionId, sessionIds),
            eq(setLogs.completed, true),
          ),
        )
    : [];

  const planDay = current.days.find((d) => d.date === date);
  const planned = planDay?.workoutId
    ? (current.workouts.find((w) => w.id === planDay.workoutId) ?? null)
    : null;
  const doneWorkout = done[0]?.workoutId
    ? (current.workouts.find((w) => w.id === done[0]!.workoutId) ?? null)
    : null;

  const row = presence[0];
  return {
    date,
    presence: {
      state: attendanceState(row),
      firstSeenAt: msToUnix(row?.firstSeenAt),
    },
    plannedWorkout: planned ? { title: planned.title } : null,
    workout: {
      sessions: done.length,
      completedSets: setRows.length,
      title: doneWorkout?.title ?? null,
    },
    meals: {
      count: dayMeals.length,
      kcal: dayMeals.reduce((s, m) => s + m.kcal, 0),
      proteinG: Math.round(dayMeals.reduce((s, m) => s + m.proteinG, 0)),
    },
    water: hydration,
    checkIn: checkIn[0] ?? null,
    weightKg: weight[0]?.kg ?? null,
  };
};
