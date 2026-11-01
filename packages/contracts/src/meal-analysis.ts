import { z } from "zod";

/** Meal vision / history extension fields (AMI-130). All additive; legacy clients can ignore them. */

export const MealAnalysisStatusSchema = z.enum(["none", "pending", "ready", "failed"]);
export const MealAnalysisSourceSchema = z.enum(["openai", "anthropic", "heuristic"]);
export const MealAnalysisJobStatusSchema = z.enum(["queued", "running", "done", "failed"]);

export const MealIngredientSchema = z.object({
  name: z.string().min(1).max(120),
  grams: z.number().min(0).max(5000).optional(),
  kcal: z.number().min(0).max(10000).optional(),
  proteinG: z.number().min(0).max(1000).optional(),
  carbsG: z.number().min(0).max(1000).optional(),
  fatG: z.number().min(0).max(1000).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

/** Optional nutrition detail shared by meal body, meal response and estimate response. */
export const MealMicrosShape = {
  fiberG: z.number().int().min(0).max(500).nullable().optional(),
  sugarG: z.number().int().min(0).max(1000).nullable().optional(),
  sodiumMg: z.number().int().min(0).max(50000).nullable().optional(),
} as const;

export const MealAnalysisBodyShape = {
  ...MealMicrosShape,
  ingredients: z.array(MealIngredientSchema).max(40).optional(),
  warnings: z.array(z.string().min(1).max(300)).max(10).optional(),
  analysisStatus: MealAnalysisStatusSchema.optional(),
  analysisSource: MealAnalysisSourceSchema.nullable().optional(),
  estimateConfidence: z.number().min(0).max(1).nullable().optional(),
} as const;

/** Response side: ingredients / warnings are always arrays, status is always set. */
export const MealAnalysisResponseShape = {
  fiberG: z.number().int().nullable().optional(),
  sugarG: z.number().int().nullable().optional(),
  sodiumMg: z.number().int().nullable().optional(),
  ingredients: z.array(MealIngredientSchema).optional(),
  warnings: z.array(z.string()).optional(),
  analysisStatus: MealAnalysisStatusSchema.optional(),
  analysisSource: MealAnalysisSourceSchema.nullable().optional(),
  estimateConfidence: z.number().nullable().optional(),
} as const;

/** MealEstimator v2 result. Superset of the v1 estimate response. */
export const MealEstimateResultV2Schema = z.object({
  name: z.string(),
  kcal: z.number().int(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  fiberG: z.number().optional(),
  sugarG: z.number().optional(),
  sodiumMg: z.number().optional(),
  ingredients: z.array(MealIngredientSchema).default([]),
  warnings: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
  source: MealAnalysisSourceSchema,
});

/** Queue row (`meal_analysis_jobs`) as exposed over the API. */
export const MealAnalysisJobSchema = z.object({
  id: z.string(),
  mealId: z.string().nullable(),
  mediaId: z.string().nullable(),
  status: MealAnalysisJobStatusSchema,
  result: MealEstimateResultV2Schema.nullable(),
  error: z.string().nullable(),
  createdAt: z.number().int(),
  finishedAt: z.number().int().nullable(),
});

/** Cached day rollup row (`nutrition_day_rollup`). */
export const NutritionDayRollupSchema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kcalIn: z.number().int(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  kcalTarget: z.number().int().nullable(),
  workoutMinutes: z.number().int(),
  setsCompleted: z.number().int(),
  updatedAt: z.number().int(),
});

export type MealAnalysisStatus = z.infer<typeof MealAnalysisStatusSchema>;
export type MealAnalysisSource = z.infer<typeof MealAnalysisSourceSchema>;
export type MealAnalysisJobStatus = z.infer<typeof MealAnalysisJobStatusSchema>;
export type MealIngredient = z.infer<typeof MealIngredientSchema>;
export type MealEstimateResultV2 = z.infer<typeof MealEstimateResultV2Schema>;
export type MealAnalysisJob = z.infer<typeof MealAnalysisJobSchema>;
export type NutritionDayRollup = z.infer<typeof NutritionDayRollupSchema>;
