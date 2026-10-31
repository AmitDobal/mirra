import { z } from "zod";

import { AccountabilityScenarioSchema } from "./insights";

export const GoalStatusSchema = z.enum(["pending", "done", "over", "skipped"]);
export const GoalKindSchema = z.enum([
  "workout",
  "meal",
  "protein",
  "checkin",
  "cardio",
  "water",
]);

export const GoalMetricSchema = z.object({
  label: z.enum(["kcal", "g", "L", "sets", "min"]),
  current: z.number(),
  target: z.number(),
});

/** One checklist row. `id` is stable per day: `${date}:${kind}[:${ref}]`. */
export const DailyGoalSchema = z.object({
  id: z.string(),
  kind: GoalKindSchema,
  title: z.string().max(40),
  subtitle: z.string().max(60).nullable(),
  status: GoalStatusSchema,
  ctaRoute: z.string(),
  metric: GoalMetricSchema.nullable(),
});

export const NextActionSchema = z.object({
  goalId: z.string(),
  kind: GoalKindSchema,
  title: z.string().max(40),
  ctaRoute: z.string(),
  reason: z.string().max(90),
  ctaLabel: z.string(),
  tone: z.enum(["alert", "warn", "good"]),
});

export const MacroKeySchema = z.enum(["kcal", "proteinG", "carbsG", "fatG"]);
export const MacroStateSchema = z.enum(["under", "hit", "over"]);

/** Remaining-first meter. `delta` is signed (+ = over target). */
export const MacroMeterSchema = z.object({
  key: MacroKeySchema,
  target: z.number(),
  logged: z.number(),
  remaining: z.number().min(0),
  delta: z.number(),
  state: MacroStateSchema,
});

export const HydrationSchema = z.object({
  targetMl: z.number().int(),
  loggedMl: z.number().int(),
});

export const TodayActionsQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const TodayActionsResponseSchema = z.object({
  date: z.string(),
  tz: z.string(),
  /** Null only when every goal is done or skipped. */
  next: NextActionSchema.nullable(),
  goals: z.array(DailyGoalSchema).max(6),
  /** Order: kcal, protein, carbs, fat. */
  macros: z.array(MacroMeterSchema).length(4),
  hydration: HydrationSchema.nullable(),
  scenario: AccountabilityScenarioSchema,
});

export const WaterLogBodySchema = z.object({
  ml: z.number().int().min(50).max(5000),
  localDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const WaterLogResponseSchema = z.object({
  id: z.string(),
  ml: z.number().int(),
  localDate: z.string(),
  loggedAt: z.number().int(),
  hydration: HydrationSchema,
});

export type GoalStatus = z.infer<typeof GoalStatusSchema>;
export type GoalKind = z.infer<typeof GoalKindSchema>;
export type DailyGoal = z.infer<typeof DailyGoalSchema>;
export type NextAction = z.infer<typeof NextActionSchema>;
export type MacroKey = z.infer<typeof MacroKeySchema>;
export type MacroState = z.infer<typeof MacroStateSchema>;
export type MacroMeter = z.infer<typeof MacroMeterSchema>;
export type Hydration = z.infer<typeof HydrationSchema>;
export type TodayActionsResponse = z.infer<typeof TodayActionsResponseSchema>;
export type WaterLogBody = z.infer<typeof WaterLogBodySchema>;
export type WaterLogResponse = z.infer<typeof WaterLogResponseSchema>;

/** Tolerance band around target: hit = within ±5% (macros) or ±10% (kcal). */
export const macroTolerance = (key: MacroKey): number => (key === "kcal" ? 0.1 : 0.05);

/** under / hit / over relative to target, using the signed delta (logged - target). */
export const macroState = (key: MacroKey, target: number, logged: number): MacroState => {
  const delta = logged - target;
  const band = Math.abs(target) * macroTolerance(key);
  if (delta > band) return "over";
  if (delta < -band) return "under";
  return "hit";
};

/** Build one remaining-first meter. Values are rounded to whole kcal / grams. */
export const buildMacroMeter = (key: MacroKey, target: number, logged: number): MacroMeter => ({
  key,
  target: Math.round(target),
  logged: Math.round(logged),
  remaining: Math.max(0, Math.round(target - logged)),
  delta: Math.round(logged - target),
  state: macroState(key, target, logged),
});
