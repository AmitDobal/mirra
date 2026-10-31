import { z } from "zod";

import { PlanExerciseSchema } from "./plans";

export const CreateWorkoutSessionBodySchema = z.object({
  workoutId: z.string().min(1),
});

export const WorkoutSessionResponseSchema = z.object({
  id: z.string(),
  workoutId: z.string().nullable(),
  startedAt: z.number().int(),
  endedAt: z.number().int().nullable(),
  rpe: z.number().int().nullable(),
  notes: z.string().nullable(),
});

export const LogSetBodySchema = z.object({
  exerciseId: z.string().min(1).nullable().optional(),
  exerciseName: z.string().min(1),
  setIndex: z.number().int().min(1),
  weightKg: z.number().nonnegative().nullable().optional(),
  reps: z.number().int().nonnegative().nullable().optional(),
  completed: z.boolean().default(true),
});

export const SetLogResponseSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  exerciseId: z.string().nullable(),
  exerciseName: z.string(),
  setIndex: z.number().int(),
  weightKg: z.number().nullable(),
  reps: z.number().int().nullable(),
  completed: z.boolean(),
  loggedAt: z.number().int(),
});

export const CompleteSessionBodySchema = z.object({
  rpe: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export type CreateWorkoutSessionBody = z.infer<typeof CreateWorkoutSessionBodySchema>;
export type WorkoutSessionResponse = z.infer<typeof WorkoutSessionResponseSchema>;
export type LogSetBody = z.infer<typeof LogSetBodySchema>;
export type SetLogResponse = z.infer<typeof SetLogResponseSchema>;
export type CompleteSessionBody = z.infer<typeof CompleteSessionBodySchema>;

/** Reps may be a number (8) or a range/text ("8-12"); stored as text. */
const TargetRepsSchema = z
  .union([z.string().trim().min(1).max(20), z.number().int().min(1).max(200)])
  .transform((v) => String(v));

export const CreatePlanExerciseBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  targetSets: z.number().int().min(1).max(20),
  targetReps: TargetRepsSchema,
  restSec: z.number().int().min(0).max(1800).nullable().optional(),
  cue: z.string().trim().max(500).nullable().optional(),
});

export const PatchPlanExerciseBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    targetSets: z.number().int().min(1).max(20).optional(),
    targetReps: TargetRepsSchema.optional(),
    restSec: z.number().int().min(0).max(1800).nullable().optional(),
    cue: z.string().trim().max(500).nullable().optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), {
    message: "Provide at least one field to update",
  });

export const PlanExerciseResponseSchema = PlanExerciseSchema;
export const PlanExerciseDeleteResponseSchema = z.object({ ok: z.literal(true) });

export type CreatePlanExerciseBody = z.infer<typeof CreatePlanExerciseBodySchema>;
export type PatchPlanExerciseBody = z.infer<typeof PatchPlanExerciseBodySchema>;
export type PlanExerciseResponse = z.infer<typeof PlanExerciseResponseSchema>;
export type PlanExerciseDeleteResponse = z.infer<typeof PlanExerciseDeleteResponseSchema>;
