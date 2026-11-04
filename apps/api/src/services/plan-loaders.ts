import type { CurrentPlanResponse, PlanStatus, PlanSummary } from "@mirra/contracts";
import { and, asc, eq } from "drizzle-orm";

import type { AppDB } from "../db";
import { planDays, plans, workoutExercises, workouts } from "../db/schema";
import { msToUnix } from "../lib/dates";
import { parseJson } from "../lib/json";
import { libraryFocus, musclesForCanonicalIds } from "./exercise-resolve";

const emptySummary = (): PlanSummary => ({
  kcalTarget: 2000,
  proteinG: 120,
  carbsG: 200,
  fatG: 65,
  outcomeLine: "",
});

export const loadCurrentPlan = async (
  db: AppDB,
  userId: string,
): Promise<CurrentPlanResponse> => {
  const [plan] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.userId, userId), eq(plans.status, "ready")))
    .limit(1);

  if (!plan) {
    return { plan: null, days: [], workouts: [] };
  }

  const days = await db
    .select()
    .from(planDays)
    .where(eq(planDays.planId, plan.id))
    .orderBy(asc(planDays.dayIndex));

  const workoutRows = await db
    .select()
    .from(workouts)
    .where(eq(workouts.planId, plan.id))
    .orderBy(asc(workouts.sortOrder));

  const exerciseRows: (typeof workoutExercises.$inferSelect)[][] = [];
  for (const w of workoutRows) {
    exerciseRows.push(
      await db
        .select()
        .from(workoutExercises)
        .where(eq(workoutExercises.workoutId, w.id))
        .orderBy(asc(workoutExercises.sortOrder)),
    );
  }
  const muscles = await musclesForCanonicalIds(
    db,
    exerciseRows.flat().flatMap((ex) => (ex.canonicalId ? [ex.canonicalId] : [])),
  );
  /** Stored id first; rows written without one (chat swaps) get a library-only match. */
  const exerciseFocus = (ex: typeof workoutExercises.$inferSelect) =>
    ex.canonicalId
      ? { canonicalId: ex.canonicalId, muscles: muscles.get(ex.canonicalId) ?? [] }
      : libraryFocus(ex.name);

  const workoutOut: CurrentPlanResponse["workouts"] = [];
  for (const [i, w] of workoutRows.entries()) {
    const exercises = exerciseRows[i] ?? [];
    workoutOut.push({
      id: w.id,
      title: w.title,
      durationMin: w.durationMin,
      focus: w.focus,
      calorieEst: w.calorieEst,
      sortOrder: w.sortOrder,
      exercises: exercises.map((ex) => ({
        id: ex.id,
        name: ex.name,
        cue: ex.cue,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        restSec: ex.restSec,
        sortOrder: ex.sortOrder,
        swapGroup: ex.swapGroup,
        ...exerciseFocus(ex),
      })),
    });
  }

  return {
    plan: {
      id: plan.id,
      version: plan.version,
      status: plan.status as PlanStatus,
      weekStart: plan.weekStart,
      summary: parseJson<PlanSummary>(plan.summaryJson, emptySummary()),
      source: plan.source,
      createdAt: msToUnix(plan.createdAt) ?? 0,
    },
    days: days.map((d) => ({
      id: d.id,
      dayIndex: d.dayIndex,
      date: d.date,
      kind: d.kind as "lift" | "rest" | "fuel",
      label: d.label,
      workoutId: d.workoutId,
    })),
    workouts: workoutOut,
  };
};

export const defaultFuelTargets = (summary: PlanSummary | null) => ({
  kcal: summary?.kcalTarget ?? 2000,
  proteinG: summary?.proteinG ?? 120,
  carbsG: summary?.carbsG ?? 200,
  fatG: summary?.fatG ?? 65,
});
