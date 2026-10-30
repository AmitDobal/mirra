import { z } from "zod";

export const MealSlotSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);

export const MealBodySchema = z.object({
  name: z.string().min(1).max(200),
  mealSlot: MealSlotSchema,
  kcal: z.number().int().min(0).max(10000),
  proteinG: z.number().min(0).max(1000).default(0),
  carbsG: z.number().min(0).max(1000).default(0),
  fatG: z.number().min(0).max(1000).default(0),
  eatenAt: z.number().int().optional(),
  mediaId: z.string().nullable().optional(),
});

export const MealResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  mealSlot: MealSlotSchema,
  kcal: z.number().int(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  eatenAt: z.number().int(),
  mediaId: z.string().nullable(),
  createdAt: z.number().int(),
});

export const FuelTodayResponseSchema = z.object({
  date: z.string(),
  targets: z.object({
    kcal: z.number().int(),
    proteinG: z.number(),
    carbsG: z.number(),
    fatG: z.number(),
  }),
  logged: z.object({
    kcal: z.number().int(),
    proteinG: z.number(),
    carbsG: z.number(),
    fatG: z.number(),
  }),
  remaining: z.object({
    kcal: z.number().int(),
    proteinG: z.number(),
    carbsG: z.number(),
    fatG: z.number(),
  }),
  meals: z.array(MealResponseSchema),
});

export type MealBody = z.infer<typeof MealBodySchema>;
export type MealResponse = z.infer<typeof MealResponseSchema>;
export type FuelTodayResponse = z.infer<typeof FuelTodayResponseSchema>;
