import { ExercisePatternSchema, ExerciseScoringSchema, MuscleIdSchema, MUSCLE_IDS } from "@mirra/contracts";
import { z } from "zod";

/** Tolerance on the muscle pct total from a tagger before we reject it (arch §3 step 5). */
export const PCT_TOLERANCE = 2;

const TagMuscleSchema = z.object({ id: MuscleIdSchema, pct: z.number().positive().max(100) });

/** Strict per-item check. Failing items fall back to the heuristic tagger. */
export const TaggedExerciseSchema = z
  .object({
    name: z.string().min(1),
    canonicalId: z.string().min(1).nullable(),
    muscles: z.array(TagMuscleSchema).min(1).max(8),
    scoring: ExerciseScoringSchema,
    pattern: ExercisePatternSchema,
  })
  .refine((t) => new Set(t.muscles.map((m) => m.id)).size === t.muscles.length, "duplicate muscle id")
  .refine(
    (t) => Math.abs(t.muscles.reduce((s, m) => s + m.pct, 0) - 100) <= PCT_TOLERANCE,
    "muscle pcts must sum to 100",
  );

export type TaggedExercise = z.infer<typeof TaggedExerciseSchema>;

/** Rescale to an exact 100 total (largest share absorbs rounding), sorted high to low. */
export const rescaleTo100 = <T extends { id: string; pct: number }>(muscles: readonly T[]): T[] => {
  const total = muscles.reduce((s, m) => s + m.pct, 0) || 1;
  const out = muscles
    .map((m) => ({ ...m, pct: Math.round((m.pct / total) * 100) }))
    .filter((m) => m.pct > 0)
    .sort((a, b) => b.pct - a.pct);
  const drift = 100 - out.reduce((s, m) => s + m.pct, 0);
  if (out[0]) out[0].pct += drift;
  return out;
};

/** OpenAI strict `json_schema` for one batch. */
export const EXERCISE_TAG_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "canonicalId", "muscles", "scoring", "pattern"],
        properties: {
          name: { type: "string" },
          canonicalId: { type: ["string", "null"] },
          muscles: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "pct"],
              properties: { id: { type: "string", enum: [...MUSCLE_IDS] }, pct: { type: "number" } },
            },
          },
          scoring: { type: "string", enum: ExerciseScoringSchema.options },
          pattern: { type: "string", enum: ExercisePatternSchema.options },
        },
      },
    },
  },
};
