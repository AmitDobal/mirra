import type {
  CreatePlanExerciseBody,
  ExerciseMuscle,
  PatchPlanExerciseBody,
  PlanExerciseResponse,
} from "@mirra/contracts";
import { and, desc, eq } from "drizzle-orm";

import type { AppDB } from "../db";
import { plans, workoutExercises, workouts } from "../db/schema";
import type { MirraEnv } from "../env";
import { getExerciseTagger } from "../lib/exercise-tagger";
import { badRequest, notFound } from "../lib/errors";
import { newId } from "../lib/id";
import { libraryFocus, musclesForCanonicalIds, resolveExerciseNames } from "./exercise-resolve";

/**
 * User-authored plan edits (S27 swap / add, routine edit). No AI writes the row: the
 * name goes through the AMI-161 resolver (library, then tag cache / tagger) for
 * `canonicalId` + muscles, same as a generated plan.
 */
type EditCtx = { db: AppDB; userId: string; env?: MirraEnv };
type ExerciseRow = typeof workoutExercises.$inferSelect;
type Focus = { canonicalId: string | null; muscles: ExerciseMuscle[] };

/** 404 unless the workout is on one of the caller's plans; 400 when that plan is not current. */
const assertOwnedWorkout = async ({ db, userId }: EditCtx, workoutId: string): Promise<void> => {
  const [row] = await db
    .select({ status: plans.status })
    .from(workouts)
    .innerJoin(plans, eq(plans.id, workouts.planId))
    .where(and(eq(workouts.id, workoutId), eq(plans.userId, userId)))
    .limit(1);
  if (!row) throw notFound("Workout not found");
  if (row.status !== "ready") throw badRequest("Workout not on your current plan");
};

/** Library → cache → tagger. Never fails the edit: an unresolved name stores null. */
const resolveFocus = async ({ db, env }: EditCtx, name: string): Promise<Focus> => {
  try {
    const { byName } = await resolveExerciseNames({ db, tagger: getExerciseTagger(env, db), names: [name] });
    const hit = byName.get(name.trim());
    if (hit) return { canonicalId: hit.canonicalId, muscles: hit.muscles };
  } catch (err) {
    console.warn("[plan-exercise-edit] resolve failed", err instanceof Error ? err.message : String(err));
  }
  return libraryFocus(name);
};

const focusOfRow = async (db: AppDB, row: ExerciseRow): Promise<Focus> => {
  if (!row.canonicalId) return libraryFocus(row.name);
  const muscles = await musclesForCanonicalIds(db, [row.canonicalId]);
  return { canonicalId: row.canonicalId, muscles: muscles.get(row.canonicalId) ?? [] };
};

const toResponse = (row: ExerciseRow, focus: Focus): PlanExerciseResponse => ({
  id: row.id,
  name: row.name,
  cue: row.cue,
  targetSets: row.targetSets,
  targetReps: row.targetReps,
  restSec: row.restSec,
  sortOrder: row.sortOrder,
  swapGroup: row.swapGroup,
  canonicalId: focus.canonicalId,
  muscles: focus.muscles,
});

const loadExercise = async (db: AppDB, workoutId: string, exerciseId: string): Promise<ExerciseRow> => {
  const [row] = await db
    .select()
    .from(workoutExercises)
    .where(and(eq(workoutExercises.id, exerciseId), eq(workoutExercises.workoutId, workoutId)))
    .limit(1);
  if (!row) throw notFound("Exercise not found");
  return row;
};

/** Append an exercise to the end of the workout. */
export const addPlanExercise = async (
  ctx: EditCtx,
  workoutId: string,
  body: CreatePlanExerciseBody,
): Promise<PlanExerciseResponse> => {
  await assertOwnedWorkout(ctx, workoutId);
  const [last] = await ctx.db
    .select({ sortOrder: workoutExercises.sortOrder })
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(desc(workoutExercises.sortOrder))
    .limit(1);
  const focus = await resolveFocus(ctx, body.name);
  const row: ExerciseRow = {
    id: newId(),
    workoutId,
    name: body.name,
    cue: body.cue ?? null,
    targetSets: body.targetSets,
    targetReps: body.targetReps,
    restSec: body.restSec ?? null,
    sortOrder: (last?.sortOrder ?? -1) + 1,
    swapGroup: null,
    canonicalId: focus.canonicalId,
  };
  await ctx.db.insert(workoutExercises).values(row);
  return toResponse(row, focus);
};

/** Edit / swap in place (same id + slot). A new name re-resolves canonicalId + muscles. */
export const patchPlanExercise = async (
  ctx: EditCtx,
  workoutId: string,
  exerciseId: string,
  body: PatchPlanExerciseBody,
): Promise<PlanExerciseResponse> => {
  await assertOwnedWorkout(ctx, workoutId);
  const current = await loadExercise(ctx.db, workoutId, exerciseId);
  const renamed = body.name !== undefined && body.name !== current.name;
  const focus = renamed ? await resolveFocus(ctx, body.name!) : await focusOfRow(ctx.db, current);
  const next: ExerciseRow = {
    ...current,
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.targetSets !== undefined ? { targetSets: body.targetSets } : {}),
    ...(body.targetReps !== undefined ? { targetReps: body.targetReps } : {}),
    ...(body.restSec !== undefined ? { restSec: body.restSec } : {}),
    ...(body.cue !== undefined ? { cue: body.cue } : {}),
    canonicalId: focus.canonicalId,
  };
  await ctx.db
    .update(workoutExercises)
    .set({
      name: next.name,
      targetSets: next.targetSets,
      targetReps: next.targetReps,
      restSec: next.restSec,
      cue: next.cue,
      canonicalId: next.canonicalId,
    })
    .where(eq(workoutExercises.id, exerciseId));
  return toResponse(next, focus);
};

export const deletePlanExercise = async (
  ctx: EditCtx,
  workoutId: string,
  exerciseId: string,
): Promise<{ ok: true }> => {
  await assertOwnedWorkout(ctx, workoutId);
  await loadExercise(ctx.db, workoutId, exerciseId);
  await ctx.db.delete(workoutExercises).where(eq(workoutExercises.id, exerciseId));
  return { ok: true };
};
