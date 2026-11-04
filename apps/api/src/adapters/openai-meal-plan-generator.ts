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
import { goalRulesBlock } from "../services/goal-copy";
import { heuristicMealPlanGenerator } from "./heuristic-meal-plan-generator";
import { MAX_CATALOG_ROWS, mealPlanJsonSchema, repairMealDraft } from "./meal-plan-repair";
import { chatCompletion } from "./openai-client";

export const MEAL_PLAN_AI_ACTION = "openai.meal.plan";

const SYSTEM = `You are Mirra Fuel, a meal planner. Pick foods ONLY from the provided catalog ids.
Reply STRICT JSON: {"meals":[{"slot":"breakfast"|"lunch"|"dinner"|"snack","title":string,"items":[{"foodId":string,"grams":number}]}]}
Rules: one meal per requested slot. 2-4 items per meal (protein + carb + veg/fruit/fat). Never output calories or macros; the server computes them.
Aim each meal near its slot budget. Respect each food's slots. Do not use avoidFoodIds. Prefer variety vs recentFoodIds.`;

/** AMI-181: appended when the user has a goal plan. Budgets stay the server's numbers. */
const GOAL_SYSTEM = goalRulesBlock(
  "GOAL DATA: goal.line and goal.status describe the user's goal. Pick dishes that suit it (protein first on a cut or a gain). Never change the slot budgets. Titles never mention weight or dates.",
);

export const mealPlanSystemPrompt = (input: MealPlanInput): string =>
  input.goal ? `${SYSTEM}\n${GOAL_SYSTEM}` : SYSTEM;

export const buildPrompt = (input: MealPlanInput): string => {
  const budgets = slotBudgets(input.remaining, input.slots);
  return JSON.stringify({
    date: input.date,
    ...(input.goal ? { goal: input.goal } : {}),
    slotBudgets: budgets,
    avoidFoodIds: input.avoidFoodIds,
    recentFoodIds: input.recentFoodIds,
    catalog: input.catalog.slice(0, MAX_CATALOG_ROWS),
  });
};

/**
 * AMI-184: repair instead of all-or-nothing. Null only when no meal survives; missing slots are
 * filled per slot by `meal-plan-draft.ts` with the heuristic.
 */
const validate = (raw: unknown, input: MealPlanInput): MealPlanResult | null => {
  const { meals, fixes } = repairMealDraft(raw, input);
  if (fixes.length > 0) console.warn(`[openai-meal-plan] repaired output: ${fixes.slice(0, 8).join("; ")}`);
  return meals.length > 0 ? { meals, source: "openai" } : null;
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
      const schema = mealPlanJsonSchema(input);
      const completion = await chatCompletion({
        apiKey,
        model,
        ...(schema ? { jsonSchema: { name: "meal_plan", schema } } : { jsonMode: true }),
        temperature: 0.5,
        messages: [
          { role: "system", content: mealPlanSystemPrompt(input) },
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
