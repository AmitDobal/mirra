import { z } from "zod";

import { ExerciseMuscleSchema } from "./muscles";

export const ExercisePatternSchema = z.enum(["push", "pull", "legs", "core"]);
export const ExerciseScoringSchema = z.enum(["load", "bodyweight", "reps", "time"]);
/** `library` = canonical entry, `ai` / `heuristic` = cached `tag:*` entry for an unknown lift. */
export const ExerciseSourceSchema = z.enum(["library", "ai", "heuristic"]);

/** `GET /v1/exercises/:canonicalId`. Library entry without standards numbers (arch §3, §6.5). */
export const LibraryExerciseResponseSchema = z.object({
  canonicalId: z.string(),
  name: z.string(),
  aliases: z.array(z.string()),
  equipment: z.array(z.string()),
  pattern: ExercisePatternSchema,
  muscles: z.array(ExerciseMuscleSchema),
  scoring: ExerciseScoringSchema,
  /** Bodyweight share counted as load (pull_up 1.0, push_up 0.65). Null for non-bodyweight lifts. */
  bwFactor: z.number().nullable(),
  /** True when the lift has a strength standard (counts toward tiers). */
  ranked: z.boolean(),
  source: ExerciseSourceSchema,
});

export type ExercisePattern = z.infer<typeof ExercisePatternSchema>;
export type ExerciseScoring = z.infer<typeof ExerciseScoringSchema>;
export type ExerciseSource = z.infer<typeof ExerciseSourceSchema>;
export type LibraryExerciseResponse = z.infer<typeof LibraryExerciseResponseSchema>;
