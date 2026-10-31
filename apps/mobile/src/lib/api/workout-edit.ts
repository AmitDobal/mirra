import { apiFetch } from "./client";
import type { PlanExercise } from "./types";

/** Mirrors contracts `CreatePlanExerciseBodySchema` — user-authored, no AI. */
export type CreateExerciseBody = {
  readonly name: string;
  readonly targetSets: number;
  readonly targetReps: string | number;
  readonly restSec?: number | null;
  readonly cue?: string | null;
};

export type PatchExerciseBody = Partial<CreateExerciseBody>;

const exercisesPath = (workoutId: string) =>
  `/v1/workouts/${encodeURIComponent(workoutId)}/exercises`;

const exercisePath = (workoutId: string, exerciseId: string) =>
  `${exercisesPath(workoutId)}/${encodeURIComponent(exerciseId)}`;

export const addPlanExercise = (workoutId: string, body: CreateExerciseBody) =>
  apiFetch<PlanExercise>(exercisesPath(workoutId), { method: "POST", body });

export const patchPlanExercise = (
  workoutId: string,
  exerciseId: string,
  body: PatchExerciseBody,
) => apiFetch<PlanExercise>(exercisePath(workoutId, exerciseId), { method: "PATCH", body });

export const deletePlanExercise = (workoutId: string, exerciseId: string) =>
  apiFetch<{ ok: true }>(exercisePath(workoutId, exerciseId), { method: "DELETE" });
