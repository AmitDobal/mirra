import { z } from "zod";

import { MealResponseSchema, MealSlotSchema } from "./fuel";

export const MacrosSchema = z.object({
  kcal: z.number().int(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
});

export const PlannedItemSchema = z.object({
  foodId: z.string(),
  name: z.string(),
  grams: z.number().int(),
  unitLabel: z.string(),
  /** Household units, e.g. 1.5 (rounded to 0.25). */
  unitQty: z.number(),
  kcal: z.number().int(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
});

export const PlannedMealStatusSchema = z.enum(["planned", "logged", "skipped"]);
export const PlannedMealFitSchema = z.enum(["ok", "approx"]);
export const MealPlanSourceSchema = z.enum(["openai", "heuristic"]);

export const PlannedMealSchema = z.object({
  id: z.string(),
  slot: MealSlotSchema,
  title: z.string(),
  items: z.array(PlannedItemSchema),
  kcal: z.number().int(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  status: PlannedMealStatusSchema,
  loggedMealId: z.string().nullable(),
  fit: PlannedMealFitSchema,
});

export const DayMealPlanSchema = z.object({
  id: z.string(),
  date: z.string(),
  targets: MacrosSchema,
  planned: MacrosSchema,
  logged: MacrosSchema,
  remaining: MacrosSchema,
  meals: z.array(PlannedMealSchema),
  source: MealPlanSourceSchema,
  rebalancedAt: z.number().int().nullable(),
});

export const GenerateMealPlanBodySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  force: z.boolean().optional(),
});

export const LogPlannedMealBodySchema = z.object({
  mealItemId: z.string().min(1),
  eatenAt: z.number().int().optional(),
  /** Client UUID, used as the meals row id (idempotency). */
  mealId: z.string().min(1).max(64).optional(),
});

export const LogPlannedMealResponseSchema = z.object({
  plan: DayMealPlanSchema,
  meal: MealResponseSchema,
});

export const SwapBodySchema = z.object({
  mealItemId: z.string().min(1),
});

export const RebalanceBodySchema = z.object({
  reason: z.enum(["off_plan_log", "manual"]).optional(),
});

/** User-authored planned meal (no AI). `itemId` in the URL is the planned meal id. */
export const CreateMealPlanItemBodySchema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: MealSlotSchema,
  name: z.string().trim().min(1).max(200),
  kcal: z.number().int().min(0).max(10000),
  proteinG: z.number().min(0).max(1000),
  carbsG: z.number().min(0).max(1000).optional(),
  fatG: z.number().min(0).max(1000).optional(),
  grams: z.number().int().min(1).max(5000).optional(),
});

export const PatchMealPlanItemBodySchema = z
  .object({
    slot: MealSlotSchema.optional(),
    name: z.string().trim().min(1).max(200).optional(),
    kcal: z.number().int().min(0).max(10000).optional(),
    proteinG: z.number().min(0).max(1000).optional(),
    carbsG: z.number().min(0).max(1000).optional(),
    fatG: z.number().min(0).max(1000).optional(),
    grams: z.number().int().min(1).max(5000).optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), {
    message: "Provide at least one field to update",
  });

export const MealPlanItemResponseSchema = z.object({
  plan: DayMealPlanSchema,
  item: PlannedMealSchema,
});

export const DeleteMealPlanItemResponseSchema = z.object({ plan: DayMealPlanSchema });

export const GetTodayMealPlanResponseSchema = z.object({
  plan: DayMealPlanSchema.nullable(),
});

export type MealSlot = z.infer<typeof MealSlotSchema>;
export type Macros = z.infer<typeof MacrosSchema>;
export type PlannedItem = z.infer<typeof PlannedItemSchema>;
export type PlannedMeal = z.infer<typeof PlannedMealSchema>;
export type DayMealPlan = z.infer<typeof DayMealPlanSchema>;
export type GenerateMealPlanBody = z.infer<typeof GenerateMealPlanBodySchema>;
export type LogPlannedMealBody = z.infer<typeof LogPlannedMealBodySchema>;
export type LogPlannedMealResponse = z.infer<typeof LogPlannedMealResponseSchema>;
export type SwapBody = z.infer<typeof SwapBodySchema>;
export type RebalanceBody = z.infer<typeof RebalanceBodySchema>;
export type CreateMealPlanItemBody = z.infer<typeof CreateMealPlanItemBodySchema>;
export type PatchMealPlanItemBody = z.infer<typeof PatchMealPlanItemBodySchema>;
export type MealPlanItemResponse = z.infer<typeof MealPlanItemResponseSchema>;
export type DeleteMealPlanItemResponse = z.infer<typeof DeleteMealPlanItemResponseSchema>;
export type GetTodayMealPlanResponse = z.infer<typeof GetTodayMealPlanResponseSchema>;
