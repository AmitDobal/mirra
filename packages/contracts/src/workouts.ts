import { z } from "zod";

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
