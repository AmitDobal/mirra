import { z } from "zod";

import type { MealEstimateResult } from "../ports/meal-estimator";

/** Strict JSON schema sent to OpenAI structured outputs (every key required, nullable when optional). */
const nullableNumber = { type: ["number", "null"] } as const;

export const MEAL_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "name", "kcal", "proteinG", "carbsG", "fatG", "fiberG", "sugarG", "sodiumMg",
    "ingredients", "warnings", "confidence", "notes",
  ],
  properties: {
    name: { type: "string" },
    kcal: { type: "number" },
    proteinG: { type: "number" },
    carbsG: { type: "number" },
    fatG: { type: "number" },
    fiberG: nullableNumber,
    sugarG: nullableNumber,
    sodiumMg: nullableNumber,
    ingredients: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "grams", "kcal", "proteinG", "carbsG", "fatG", "confidence"],
        properties: {
          name: { type: "string" },
          grams: nullableNumber,
          kcal: nullableNumber,
          proteinG: nullableNumber,
          carbsG: nullableNumber,
          fatG: nullableNumber,
          confidence: nullableNumber,
        },
      },
    },
    warnings: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
    notes: { type: ["string", "null"] },
  },
} as const;

const opt = (max: number) => z.number().min(0).max(max).nullish().transform((v) => v ?? undefined);
const clamp01 = z.number().transform((v) => Math.min(1, Math.max(0, v)));

const IngredientSchema = z.object({
  name: z.string().min(1).max(120),
  grams: opt(5000),
  kcal: opt(10000),
  proteinG: opt(1000),
  carbsG: opt(1000),
  fatG: opt(1000),
  confidence: z
    .number()
    .nullish()
    .transform((v) => (v == null ? undefined : Math.min(1, Math.max(0, v)))),
});

export const MealModelOutputSchema = z.object({
  name: z.string().min(1).max(120),
  kcal: z.number().min(0).max(5000),
  proteinG: z.number().min(0).max(400),
  carbsG: z.number().min(0).max(600),
  fatG: z.number().min(0).max(300),
  fiberG: opt(500),
  sugarG: opt(1000),
  sodiumMg: opt(50000),
  ingredients: z.array(IngredientSchema).max(40),
  warnings: z.array(z.string().min(1).max(300)).max(10),
  confidence: clamp01,
  notes: z.string().max(400).nullish().transform((v) => v ?? undefined),
});

/** Drop undefined keys so JSON responses stay compact. */
const compact = <T extends Record<string, unknown>>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

export const toMealEstimateResult = (
  parsed: z.infer<typeof MealModelOutputSchema>,
): MealEstimateResult => ({
  ...compact({
    name: parsed.name,
    kcal: Math.round(parsed.kcal),
    proteinG: parsed.proteinG,
    carbsG: parsed.carbsG,
    fatG: parsed.fatG,
    fiberG: parsed.fiberG,
    sugarG: parsed.sugarG,
    sodiumMg: parsed.sodiumMg,
    notes: parsed.notes,
  }),
  ingredients: parsed.ingredients.map((i) => compact(i)),
  warnings: parsed.warnings,
  confidence: parsed.confidence,
  source: "openai",
}) as MealEstimateResult;
