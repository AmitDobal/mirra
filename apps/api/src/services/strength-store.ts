/**
 * D1 reads shared by the strength recompute and the strength GET endpoints.
 * Every query filters by `user_id`.
 */
import type { MuscleGroupId, MuscleId, StrengthUnits } from "@mirra/contracts";
import { MUSCLE_GROUP_IDS, MUSCLE_IDS } from "@mirra/contracts";
import { and, eq, gte, isNotNull, sql } from "drizzle-orm";

import type { AppDB } from "../db";
import {
  exerciseScores,
  muscleScores,
  plans,
  setLogs,
  strengthSummary,
  workoutExercises,
  workoutSessions,
  workouts,
} from "../db/schema";
import type { Contributor } from "../lib/strength/aggregate";
import type { StrengthSex } from "../lib/strength/percentile";
import type { Scored, StrengthSnapshot } from "../lib/strength/rollup";
import type { ExerciseScoreRow } from "../lib/strength/session";
import { parseJson } from "../lib/json";
import { raw } from "./credits-ledger";

export const DAY_MS = 86_400_000;
export const VOLUME_WINDOW_DAYS = 90;

export type StrengthContext = { sex: StrengthSex; bw: number | null; units: StrengthUnits };

/** Sex, bodyweight (latest weight log, else profile) and units in one statement. */
export const loadStrengthContext = async (db: AppDB, userId: string): Promise<StrengthContext> => {
  const row = await raw(db)
    .prepare(
      `SELECT
         (SELECT sex FROM profiles WHERE user_id = ?1) AS sex,
         (SELECT weight_kg FROM profiles WHERE user_id = ?1) AS profile_kg,
         (SELECT kg FROM weight_logs WHERE user_id = ?1 ORDER BY logged_at DESC LIMIT 1) AS log_kg,
         (SELECT units FROM preferences WHERE user_id = ?1) AS units`,
    )
    .bind(userId)
    .first<{ sex: string | null; profile_kg: number | null; log_kg: number | null; units: string | null }>();
  const sex = row?.sex === "male" || row?.sex === "female" ? row.sex : null;
  const bw = row?.log_kg ?? row?.profile_kg ?? null;
  return { sex, bw: bw != null && bw > 0 ? bw : null, units: row?.units === "imperial" ? "imperial" : "metric" };
};

export const toScoreRow = (r: typeof exerciseScores.$inferSelect): ExerciseScoreRow => ({
  exerciseId: r.exerciseId,
  sustainedPct: r.sustainedPct,
  bestPct: r.bestPct,
  lastSessionPct: r.lastSessionPct,
  sessions: r.sessions,
  displayStep: r.displayStep,
  belowCount: r.belowCount,
  bestE1rmKg: r.bestE1rmKg,
  bestWeightKg: r.bestWeightKg,
  bestReps: r.bestReps,
});

export const selectExerciseScores = (db: AppDB, userId: string) =>
  db.select().from(exerciseScores).where(eq(exerciseScores.userId, userId));

export const selectMuscleScores = (db: AppDB, userId: string) =>
  db.select().from(muscleScores).where(eq(muscleScores.userId, userId));

export const selectSummary = (db: AppDB, userId: string) =>
  db.select().from(strengthSummary).where(eq(strengthSummary.userId, userId)).limit(1);

/** Completed sets per canonical id over the last 90 days. */
export const selectSets90d = (db: AppDB, userId: string, now: number) =>
  db
    .select({ canonicalId: setLogs.canonicalId, n: sql<number>`count(*)` })
    .from(setLogs)
    .innerJoin(workoutSessions, eq(setLogs.sessionId, workoutSessions.id))
    .where(
      and(
        eq(workoutSessions.userId, userId),
        gte(workoutSessions.startedAt, new Date(now - VOLUME_WINDOW_DAYS * DAY_MS)),
        eq(setLogs.completed, true),
        isNotNull(setLogs.canonicalId),
      ),
    )
    .groupBy(setLogs.canonicalId);

export const toCountMap = (rows: readonly { canonicalId: string | null; n: number }[]): Map<string, number> =>
  new Map(rows.flatMap((r) => (r.canonicalId ? [[r.canonicalId, Number(r.n)] as const] : [])));

export type MuscleRow = Scored & { contributors: Contributor[] };
type GroupJson = { id: MuscleGroupId; pct: number; step: number };

export const toMuscleMap = (rows: readonly (typeof muscleScores.$inferSelect)[]): Map<MuscleId, MuscleRow> => {
  const valid = new Set<string>(MUSCLE_IDS);
  return new Map(
    rows
      .filter((r) => valid.has(r.muscleId))
      .map((r) => [
        r.muscleId as MuscleId,
        { pct: r.pct, step: r.displayStep, contributors: parseJson<Contributor[]>(r.contributorsJson, []) },
      ]),
  );
};

export const toGroupMap = (groupsJson: string | null | undefined): Map<MuscleGroupId, Scored> => {
  const valid = new Set<string>(MUSCLE_GROUP_IDS);
  const xs = parseJson<GroupJson[]>(groupsJson ?? "[]", []);
  return new Map(xs.filter((g) => valid.has(g.id)).map((g) => [g.id, { pct: g.pct, step: g.step }]));
};

export const snapshotOf = (
  muscleRows: readonly (typeof muscleScores.$inferSelect)[],
  summary: typeof strengthSummary.$inferSelect | undefined,
): StrengthSnapshot => ({
  muscles: toMuscleMap(muscleRows),
  groups: toGroupMap(summary?.groupsJson),
  overall:
    summary?.overallPct != null && summary.overallStep != null
      ? { pct: summary.overallPct, step: summary.overallStep }
      : null,
});

/** Rep prescription for a canonical lift on the user's current plan (for next targets). */
export const loadPlanReps = async (db: AppDB, userId: string, canonicalId: string): Promise<string | null> => {
  const [row] = await db
    .select({ reps: workoutExercises.targetReps })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .innerJoin(plans, eq(workouts.planId, plans.id))
    .where(and(eq(plans.userId, userId), eq(plans.status, "ready"), eq(workoutExercises.canonicalId, canonicalId)))
    .limit(1);
  return row?.reps ?? null;
};
