import { z } from "zod";

export const PlanJobStatusSchema = z.enum(["queued", "running", "done", "failed"]);
export const PlanStatusSchema = z.enum(["generating", "ready", "superseded", "failed"]);
export const PlanDayKindSchema = z.enum(["lift", "rest", "fuel"]);

export const PlanGenerateBodySchema = z.object({
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const PlanGenerateResponseSchema = z.object({
  jobId: z.string(),
});

export const PlanJobResponseSchema = z.object({
  status: PlanJobStatusSchema,
  planId: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
});

export const PlanExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  cue: z.string().nullable(),
  targetSets: z.number().int(),
  targetReps: z.string(),
  restSec: z.number().int().nullable(),
  sortOrder: z.number().int(),
  swapGroup: z.string().nullable(),
});

export const PlanWorkoutSchema = z.object({
  id: z.string(),
  title: z.string(),
  durationMin: z.number().int(),
  focus: z.string().nullable(),
  calorieEst: z.number().int().nullable(),
  sortOrder: z.number().int(),
  exercises: z.array(PlanExerciseSchema),
});

export const PlanDaySchema = z.object({
  id: z.string(),
  dayIndex: z.number().int(),
  date: z.string(),
  kind: PlanDayKindSchema,
  label: z.string().nullable(),
  workoutId: z.string().nullable(),
});

export const PlanSummarySchema = z.object({
  kcalTarget: z.number().int(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  outcomeLine: z.string(),
});

export const CurrentPlanResponseSchema = z.object({
  plan: z
    .object({
      id: z.string(),
      version: z.number().int(),
      status: PlanStatusSchema,
      weekStart: z.string(),
      summary: PlanSummarySchema,
      source: z.string(),
      createdAt: z.number().int(),
    })
    .nullable(),
  days: z.array(PlanDaySchema),
  workouts: z.array(PlanWorkoutSchema),
});

export type PlanGenerateBody = z.infer<typeof PlanGenerateBodySchema>;
export type PlanGenerateResponse = z.infer<typeof PlanGenerateResponseSchema>;
export type PlanJobResponse = z.infer<typeof PlanJobResponseSchema>;
export type PlanJobStatus = z.infer<typeof PlanJobStatusSchema>;
export type PlanStatus = z.infer<typeof PlanStatusSchema>;
export type CurrentPlanResponse = z.infer<typeof CurrentPlanResponseSchema>;
export type PlanSummary = z.infer<typeof PlanSummarySchema>;
