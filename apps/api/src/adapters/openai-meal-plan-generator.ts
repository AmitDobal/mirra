import { z } from "zod";

import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import { logAiUsage } from "../lib/ai-usage";
import { slotBudgets } from "../lib/meal-macros";
import type {
  MealPlanGenerator,
  MealPlanInput,
  MealPlanResult,
} from "../ports/meal-plan-generator";
import { canSpend } from "../services/ai-budget";
import { heuristicMealPlanGenerator } from "./heuristic-meal-plan-generator";
import { chatCompletion } from "./openai-client";

export const MEAL_PLAN_AI_ACTION = "openai.meal.plan";
const MAX_CATALOG_ROWS = 120;

const DraftSchema = z.object({
  meals: z
    .array(
      z.object({
        slot: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        title: z.string().min(1).max(80),
        items: z
          .array(
            z.object({
              foodId: z.string().min(1),
              grams: z.number().positive().max(2000),
            }),
          )
          .min(1)
          .max(6),
      }),
    )
    .min(1),
});

const SYSTEM = `You are Mirra Fuel, a meal planner. Pick foods ONLY from the provided catalog ids.
Reply STRICT JSON: {"meals":[{"slot":"breakfast"|"lunch"|"dinner"|"snack","title":string,"items":[{"foodId":string,"grams":number}]}]}
Rules: one meal per requested slot. 2-4 items per meal (protein + carb + veg/fruit/fat). Never output calories or macros; the server computes them.
Aim each meal near its slot budget. Respect each food's slots. Do not use avoidFoodIds. Prefer variety vs recentFoodIds.`;

const buildPrompt = (input: MealPlanInput): string => {
  const budgets = slotBudgets(input.remaining, input.slots);
  return JSON.stringify({
    date: input.date,
    slotBudgets: budgets,
    avoidFoodIds: input.avoidFoodIds,
    recentFoodIds: input.recentFoodIds,
    catalog: input.catalog.slice(0, MAX_CATALOG_ROWS),
  });
};

/** Returns null when the model output breaks the catalog / slot contract. */
const validate = (raw: unknown, input: MealPlanInput): MealPlanResult | null => {
  const parsed = DraftSchema.safeParse(raw);
  if (!parsed.success) return null;
  const allowed = new Set(input.catalog.map((r) => r.id));
  const avoid = new Set(input.avoidFoodIds);
  const wanted = new Set(input.slots);
  const seen = new Set<string>();
  for (const meal of parsed.data.meals) {
    if (!wanted.has(meal.slot) || seen.has(meal.slot)) return null;
    seen.add(meal.slot);
    if (meal.items.some((i) => !allowed.has(i.foodId) || avoid.has(i.foodId))) return null;
  }
  if (seen.size !== wanted.size) return null;
  return { meals: parsed.data.meals, source: "openai" };
};

/** OpenAI meal planner (metered). Any cap hit, API error or invalid JSON → heuristic. */
export const createOpenAiMealPlanGenerator = (
  env: MirraEnv,
  db?: AppDB,
): MealPlanGenerator => ({
  generate: async (input) => {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey || input.catalog.length === 0) return heuristicMealPlanGenerator.generate(input);
    if (!(await canSpend(db, input.userId, "meal_plan"))) {
      console.warn("[openai-meal-plan] AI budget reached → heuristic");
      return heuristicMealPlanGenerator.generate(input);
    }

    const model = env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    try {
      const completion = await chatCompletion({
        apiKey,
        model,
        jsonMode: true,
        temperature: 0.5,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: buildPrompt(input) },
        ],
      });
      await logAiUsage({
        db,
        userId: input.userId,
        action: MEAL_PLAN_AI_ACTION,
        feature: "meal_plan",
        model: completion.model,
        usage: completion.usage,
      });
      const result = validate(JSON.parse(completion.content), input);
      if (result) return result;
      console.warn("[openai-meal-plan] invalid output → heuristic");
    } catch (err) {
      console.warn(
        "[openai-meal-plan] error → heuristic",
        err instanceof Error ? err.message : String(err),
      );
    }
    return heuristicMealPlanGenerator.generate(input);
  },
});
