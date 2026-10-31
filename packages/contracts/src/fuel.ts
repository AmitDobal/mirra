import { z } from "zod";

import { HydrationSchema } from "./today-actions";

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

/** Partial meal edit. `slot` is accepted as an alias of `mealSlot`. */
export const MealPatchBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    mealSlot: MealSlotSchema.optional(),
    slot: MealSlotSchema.optional(),
    kcal: z.number().int().min(0).max(10000).optional(),
    proteinG: z.number().min(0).max(1000).optional(),
    carbsG: z.number().min(0).max(1000).optional(),
    fatG: z.number().min(0).max(1000).optional(),
    eatenAt: z.number().int().optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), {
    message: "Provide at least one field to update",
  });

export const MealDeleteResponseSchema = z.object({ ok: z.literal(true) });

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
  /** Server-backed water (`water_logs`); null only if hydration cannot be computed. */
  hydration: HydrationSchema.nullable(),
});

export const MealEstimateBodySchema = z
  .object({
    /** data:image/...;base64,... or https URL */
    imageDataUrl: z.string().min(1).max(6_000_000).optional(),
    description: z.string().min(1).max(2000).optional(),
  })
  .refine((b) => Boolean(b.imageDataUrl || b.description), {
    message: "Provide imageDataUrl and/or description",
  });

export const MealEstimateResponseSchema = z.object({
  name: z.string(),
  kcal: z.number().int(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  confidence: z.number(),
  notes: z.string().optional(),
  source: z.enum(["openai", "heuristic"]),
});

export type MealBody = z.infer<typeof MealBodySchema>;
export type MealPatchBody = z.infer<typeof MealPatchBodySchema>;
export type MealDeleteResponse = z.infer<typeof MealDeleteResponseSchema>;
export type MealResponse = z.infer<typeof MealResponseSchema>;
export type FuelTodayResponse = z.infer<typeof FuelTodayResponseSchema>;
export type MealEstimateBody = z.infer<typeof MealEstimateBodySchema>;
export type MealEstimateResponse = z.infer<typeof MealEstimateResponseSchema>;

export const MealListResponseSchema = z.object({
  items: z.array(MealResponseSchema),
  nextCursor: z.string().nullable(),
});
export type MealListResponse = z.infer<typeof MealListResponseSchema>;
