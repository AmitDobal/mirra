import type { ExercisePattern, ExerciseScoring, MuscleId } from "@mirra/contracts";

/** Tag lifts the exercise library does not know (arch §3 step 5). One batched call per plan. */

export type ExerciseTagInput = {
  /** Original plan names that missed the library and the D1 cache. */
  names: string[];
  /** Library ids + names so the model can map a variant onto an existing entry. */
  library: { id: string; name: string }[];
};

export type ExerciseTag = {
  /** Echo of the input name. */
  name: string;
  /** Library id when the lift is a known exercise under another name, else null. */
  canonicalId: string | null;
  /** Sums to 100 (±2 before rescale). */
  muscles: { id: MuscleId; pct: number }[];
  scoring: ExerciseScoring;
  pattern: ExercisePattern;
  source: "ai" | "heuristic";
  model: string | null;
};

export type ExerciseTagger = {
  /** `ai` taggers re-tag names whose cache row came from the heuristic adapter. */
  readonly provider: "ai" | "heuristic";
  /** Returns at most one tag per input name. Missing names are filled by the caller's fallback. */
  tag: (input: ExerciseTagInput) => Promise<ExerciseTag[]>;
};
