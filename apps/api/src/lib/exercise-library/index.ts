import type { ExerciseMuscle, LibraryExerciseResponse, MuscleId } from "@mirra/contracts";
import { muscleRoleOf } from "@mirra/contracts";

import { EXERCISE_LIBRARY } from "../../data/exercises";
import { buildLibraryIndex, matchLibrary, type LibraryIndex, type LibraryMatch } from "./match";
import { isLoadPerHand, type LibraryExercise } from "./types";

export * from "./match";
export * from "./normalize";
export * from "./types";

let cached: LibraryIndex | null = null;

/** Built once per isolate. */
export const libraryIndex = (): LibraryIndex => (cached ??= buildLibraryIndex(EXERCISE_LIBRARY));

export const libraryEntry = (id: string): LibraryExercise | null => libraryIndex().byId.get(id) ?? null;

/** Library-only match (no cache, no AI). Pure. */
export const matchExerciseName = (name: string): LibraryMatch | null => matchLibrary(libraryIndex(), name);

/** Prefix for cache-backed ids of lifts outside the library. */
export const TAG_PREFIX = "tag:";

export const isTagId = (id: string): boolean => id.startsWith(TAG_PREFIX);

/**
 * Roles by `PRIMARY_MUSCLE_PCT`. A split with no muscle at the threshold (an AI-tagged
 * lift) still gets one primary: its top muscle, so the S36 anatomy always shows lime.
 */
export const withRoles = (muscles: readonly { id: MuscleId; pct: number }[]): ExerciseMuscle[] => {
  const out = muscles.map((m) => ({ id: m.id, pct: m.pct, role: muscleRoleOf(m.pct) }));
  if (out.length && !out.some((m) => m.role === "primary")) {
    const top = out.reduce((best, m) => (m.pct > best.pct ? m : best));
    top.role = "primary";
  }
  return out;
};

export const libraryResponse = (entry: LibraryExercise): LibraryExerciseResponse => ({
  canonicalId: entry.id,
  name: entry.name,
  aliases: entry.aliases,
  equipment: entry.equipment,
  pattern: entry.pattern,
  muscles: withRoles(entry.muscles),
  scoring: entry.scoring,
  bwFactor: entry.bwFactor ?? null,
  ranked: entry.standard != null,
  loadPerHand: isLoadPerHand(entry),
  source: "library",
});
