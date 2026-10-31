import type {
  CreatePlanExerciseBody,
  PatchPlanExerciseBody,
  PlanExerciseResponse,
} from "@mirra/contracts";
import { and, eq, max } from "drizzle-orm";

import type { AppDB } from "../db";
import { plans, workoutExercises, workouts } from "../db/schema";
import { notFound } from "../lib/errors";
import { newId } from "../lib/id";

/** User-authored exercise edits (no AI) on a workout of the user's current plan. */

type ExerciseRow = typeof workoutExercises.$inferSelect;

const toExercise = (r: ExerciseRow): PlanExerciseResponse => ({
  id: r.id,
  name: r.name,
  cue: r.cue,
  targetSets: r.targetSets,
  targetReps: r.targetReps,
  restSec: r.restSec,
  sortOrder: r.sortOrder,
  swapGroup: r.swapGroup,
});

/** 404 unless the workout belongs to the user's ready (current) plan. */
const assertWorkoutOnCurrentPlan = async (
  db: AppDB,
  userId: string,
  workoutId: string,
): Promise<void> => {
  const [row] = await db
    .select({ id: workouts.id })
    .from(workouts)
    .innerJoin(plans, eq(workouts.planId, plans.id))
    .where(
      and(eq(workouts.id, workoutId), eq(plans.userId, userId), eq(plans.status, "ready")),
    )
    .limit(1);
  if (!row) throw notFound("Workout not found");
};

const findExercise = async (db: AppDB, workoutId: string, exerciseId: string) => {
  const [row] = await db
    .select()
    .from(workoutExercises)
    .where(and(eq(workoutExercises.id, exerciseId), eq(workoutExercises.workoutId, workoutId)))
    .limit(1);
  if (!row) throw notFound("Exercise not found");
  return row;
};

export const addExercise = async (
  db: AppDB,
  userId: string,
  workoutId: string,
  body: CreatePlanExerciseBody,
): Promise<PlanExerciseResponse> => {
  await assertWorkoutOnCurrentPlan(db, userId, workoutId);
  const [top] = await db
    .select({ n: max(workoutExercises.sortOrder) })
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId));
  const row: ExerciseRow = {
    id: newId(),
    workoutId,
    name: body.name,
    cue: body.cue ?? null,
    targetSets: body.targetSets,
    targetReps: body.targetReps,
    restSec: body.restSec ?? null,
    sortOrder: (top?.n ?? -1) + 1,
    swapGroup: null,
  };
  await db.insert(workoutExercises).values(row);
  return toExercise(row);
};

export const patchExercise = async (
  db: AppDB,
  userId: string,
  workoutId: string,
  exerciseId: string,
  body: PatchPlanExerciseBody,
): Promise<PlanExerciseResponse> => {
  await assertWorkoutOnCurrentPlan(db, userId, workoutId);
  const existing = await findExercise(db, workoutId, exerciseId);
  const set: Partial<ExerciseRow> = {};
  if (body.name !== undefined) set.name = body.name;
  if (body.targetSets !== undefined) set.targetSets = body.targetSets;
  if (body.targetReps !== undefined) set.targetReps = body.targetReps;
  if (body.restSec !== undefined) set.restSec = body.restSec;
  if (body.cue !== undefined) set.cue = body.cue;
  // A renamed exercise no longer belongs to its original swap family.
  if (body.name !== undefined && body.name !== existing.name) set.swapGroup = null;
  await db.update(workoutExercises).set(set).where(eq(workoutExercises.id, exerciseId));
  return toExercise({ ...existing, ...set });
};

export const removeExercise = async (
  db: AppDB,
  userId: string,
  workoutId: string,
  exerciseId: string,
): Promise<void> => {
  await assertWorkoutOnCurrentPlan(db, userId, workoutId);
  await findExercise(db, workoutId, exerciseId);
  await db.delete(workoutExercises).where(eq(workoutExercises.id, exerciseId));
};
