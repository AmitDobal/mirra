import type { MuscleId } from "@/features/anatomy/muscle-ids";

import { apiFetch } from "./client";

/** Mirrors contracts `ExerciseMuscleSchema` (muscles.ts). */
export type ExerciseMuscle = {
  readonly id: MuscleId;
  readonly pct: number;
  readonly role: "primary" | "secondary";
};

export type ExerciseScoring = "load" | "bodyweight" | "reps" | "time";

/** Mirrors contracts `LibraryExerciseResponseSchema` (`GET /v1/exercises/:canonicalId`). */
export type LibraryExercise = {
  readonly canonicalId: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly equipment: readonly string[];
  readonly pattern: "push" | "pull" | "legs" | "core";
  readonly muscles: readonly ExerciseMuscle[];
  readonly scoring: ExerciseScoring;
  readonly bwFactor: number | null;
  readonly ranked: boolean;
  readonly source: "library" | "ai" | "heuristic";
};

/** Library entries never change inside a session: cache the promise per id. */
const cache = new Map<string, Promise<LibraryExercise>>();

export const getLibraryExercise = (canonicalId: string): Promise<LibraryExercise> => {
  const hit = cache.get(canonicalId);
  if (hit) return hit;
  const req = apiFetch<LibraryExercise>(`/v1/exercises/${encodeURIComponent(canonicalId)}`);
  cache.set(canonicalId, req);
  req.catch(() => cache.delete(canonicalId));
  return req;
};
