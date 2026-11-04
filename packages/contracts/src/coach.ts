import { z } from "zod";

import { CheckInStatusSchema } from "./check-ins";
import { ReviseItemSchema } from "./coach-diff";
import { MealSlotSchema } from "./fuel";
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

export * from "./coach-diff";

export const CoachReviseScopeSchema = z.enum(["auto", "meal", "workout", "both"]);

/**
 * Structured edit the preview resolved. Echoed back on confirm so "Yes, apply" never
 * re-parses the free-text message (no LLM drift between preview and apply).
 */
export const CoachReviseIntentSchema = z.object({
  equipmentAdd: z.array(z.string()).max(12).default([]),
  equipmentRemove: z.array(z.string()).max(12).default([]),
  foodsAvoidAdd: z.array(z.string()).max(12).default([]),
  dietTagsAdd: z.array(z.string()).max(12).default([]),
  cuisineStylesAdd: z.array(z.string()).max(12).default([]),
  cuisineStylesOnly: z.boolean().optional(),
  forceMealRegen: z.boolean().default(false),
  reviseWorkout: z.boolean().default(false),
  /** Legacy (pre-v2 clients echo it). Server keeps it in sync with `preferExercises`. */
  preferBench: z.boolean().optional(),
  shortenMin: z.number().optional(),
  /** Target meals per day (1-4). */
  mealsPerDay: z.number().int().min(1).max(4).optional(),
  // --- Intent v2 (AMI-163). All optional so v1 clients' echoed intents still parse.
  /** "swap my lunch": only these slots are redrafted. */
  mealSlots: z.array(MealSlotSchema).max(4).optional(),
  /** "swap my lunch for something with more protein": candidate pick bias (not a saved pref). */
  mealBias: z.enum(["high_protein", "low_carb", "lighter"]).optional(),
  exerciseSwaps: z
    .array(z.object({ from: z.string().max(60), to: z.string().max(60).nullable() }))
    .max(6)
    .optional(),
  exerciseAdds: z
    .array(z.object({ name: z.string().max(60), sets: z.number().int().optional(), reps: z.string().max(16).optional() }))
    .max(6)
    .optional(),
  exerciseRemoves: z.array(z.string().max(60)).max(6).optional(),
  preferExercises: z.array(z.string().max(60)).max(6).optional(),
  scheduleMoves: z.array(z.object({ from: z.string().max(16), to: z.string().max(16) })).max(3).optional(),
  /** Short AI reason per item key (≤80 chars, sanitized). */
  reasons: z.record(z.string().max(80)).optional(),
});

/** POST /v1/coach/revise — chat message that edits the existing meal/workout plan. */
export const CoachReviseBodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  scope: CoachReviseScopeSchema.optional(),
  /** Target day (YYYY-MM-DD). Defaults to today (UTC). */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Preview only: describe changes without persisting anything. */
  dryRun: z.boolean().optional(),
  /** Confirm path: apply exactly this previewed intent instead of re-reading `message`. */
  intent: CoachReviseIntentSchema.optional(),
  context: z
    .object({
      workoutId: z.string().min(1).max(64).optional(),
      mealItemId: z.string().min(1).max(64).optional(),
      exerciseId: z.string().min(1).max(64).optional(),
    })
    .optional(),
});

export const CoachReviseAreaSchema = z.enum(["workout", "meal", "prefs"]);

export const CoachReviseChangeSchema = z.object({
  kind: z.string(),
  summary: z.string(),
  /** Which part of the plan this touches (drives proposal card grouping). */
  area: CoachReviseAreaSchema.optional(),
  /** Structured diff for the proposal card; absent when only `summary` is known. */
  before: z.string().optional(),
  after: z.string().optional(),
});

export const CoachReviseResponseSchema = z.object({
  message: z.string(),
  changes: z.array(CoachReviseChangeSchema),
  applied: z.boolean(),
  source: z.enum(["openai", "heuristic"]),
  mealPlan: DayMealPlanSchema.nullable().optional(),
  workoutTitle: z.string().nullable().optional(),
  warnings: z.array(z.string()).optional(),
  /** Resolved intent; send it back with dryRun:false to apply this exact preview. */
  intent: CoachReviseIntentSchema.optional(),
  /** v2: stored draft to commit via POST /v1/coach/revise/apply (null when nothing to apply). */
  draftId: z.string().nullable().optional(),
  /** Epoch ms; the draft cannot be applied after this. */
  expiresAt: z.number().nullable().optional(),
  /** v2 typed diff rows. Legacy `changes` is derived from these. */
  items: z.array(ReviseItemSchema).optional(),
});

export type CoachReadiness = z.infer<typeof CoachReadinessSchema>;
export type CoachAdviseBody = z.infer<typeof CoachAdviseBodySchema>;
export type CoachVector = z.infer<typeof CoachVectorSchema>;
export type CoachPillTone = z.infer<typeof CoachPillToneSchema>;
export type CoachPill = z.infer<typeof CoachPillSchema>;
export type CoachAdviseResponse = z.infer<typeof CoachAdviseResponseSchema>;
export type CoachReviseIntent = z.infer<typeof CoachReviseIntentSchema>;
export type CoachReviseScope = z.infer<typeof CoachReviseScopeSchema>;
export type CoachReviseBody = z.infer<typeof CoachReviseBodySchema>;
export type CoachReviseArea = z.infer<typeof CoachReviseAreaSchema>;
export type CoachReviseChange = z.infer<typeof CoachReviseChangeSchema>;
export type CoachReviseResponse = z.infer<typeof CoachReviseResponseSchema>;
