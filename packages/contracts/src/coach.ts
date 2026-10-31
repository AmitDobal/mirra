import { z } from "zod";

import { CheckInStatusSchema } from "./check-ins";
import { AccountabilityScenarioSchema } from "./insights";
import { DayMealPlanSchema } from "./meal-plan";

/** UI readiness (Coach tab) or optional 0–10 scale. */
export const CoachReadinessSchema = z.union([
  z.enum(["push", "rest"]),
  z.number().min(0).max(10),
]);

export const CoachAdviseBodySchema = z.object({
  readiness: CoachReadinessSchema.optional(),
  status: CheckInStatusSchema.optional(),
  note: z.string().max(2000).optional(),
  vectorId: z.string().min(1).max(64).optional(),
  localDate: z.string().min(1).max(32).optional(),
  context: z.string().max(2000).optional(),
  /** When true (default), API injects personal fuel/training snapshot into the coach. */
  includePersonal: z.boolean().optional(),
});

export const CoachVectorSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  recommended: z.boolean(),
});

export const CoachPillToneSchema = z.enum(["calm", "push", "alert", "win"]);

/** Deterministic mood/intent chip derived from scenario + readiness (no LLM). */
export const CoachPillSchema = z.object({
  id: z.string(),
  label: z.string(),
  tone: CoachPillToneSchema,
});

export const CoachAdviseResponseSchema = z.object({
  message: z.string(),
  vectors: z.array(CoachVectorSchema).optional(),
  rebuildSuggested: z.boolean(),
  coachMessage: z.string().optional(),
  source: z.enum(["openai", "heuristic"]).optional(),
  scenario: AccountabilityScenarioSchema.optional(),
  pills: z.array(CoachPillSchema).max(3).optional(),
});

export const CoachReviseScopeSchema = z.enum(["auto", "meal", "workout", "both"]);

/** POST /v1/coach/revise — chat message that edits the existing meal/workout plan. */
export const CoachReviseBodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  scope: CoachReviseScopeSchema.optional(),
  /** Target day (YYYY-MM-DD). Defaults to today (UTC). */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Preview only: describe changes without persisting anything. */
  dryRun: z.boolean().optional(),
  context: z
    .object({
      workoutId: z.string().min(1).max(64).optional(),
      mealItemId: z.string().min(1).max(64).optional(),
      exerciseId: z.string().min(1).max(64).optional(),
    })
    .optional(),
});

export const CoachReviseChangeSchema = z.object({
  kind: z.string(),
  summary: z.string(),
});

export const CoachReviseResponseSchema = z.object({
  message: z.string(),
  changes: z.array(CoachReviseChangeSchema),
  applied: z.boolean(),
  source: z.enum(["openai", "heuristic"]),
  mealPlan: DayMealPlanSchema.nullable().optional(),
  workoutTitle: z.string().nullable().optional(),
  warnings: z.array(z.string()).optional(),
});

export type CoachReadiness = z.infer<typeof CoachReadinessSchema>;
export type CoachAdviseBody = z.infer<typeof CoachAdviseBodySchema>;
export type CoachVector = z.infer<typeof CoachVectorSchema>;
export type CoachPillTone = z.infer<typeof CoachPillToneSchema>;
export type CoachPill = z.infer<typeof CoachPillSchema>;
export type CoachAdviseResponse = z.infer<typeof CoachAdviseResponseSchema>;
export type CoachReviseScope = z.infer<typeof CoachReviseScopeSchema>;
export type CoachReviseBody = z.infer<typeof CoachReviseBodySchema>;
export type CoachReviseChange = z.infer<typeof CoachReviseChangeSchema>;
export type CoachReviseResponse = z.infer<typeof CoachReviseResponseSchema>;
