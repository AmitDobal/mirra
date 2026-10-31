import { heuristicMealPlanGenerator } from "../adapters/heuristic-meal-plan-generator";
import { createOpenAiMealPlanGenerator } from "../adapters/openai-meal-plan-generator";
import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import type { MealPlanGenerator } from "../ports/meal-plan-generator";
import { resolveAiProvider } from "./ai/resolve-provider";

export const getMealPlanGenerator = (env: MirraEnv, db?: AppDB): MealPlanGenerator => {
  const tag = resolveAiProvider(env);
  if (tag === "openai") return createOpenAiMealPlanGenerator(env, db);
  return heuristicMealPlanGenerator;
};

/** Swap is always server-side heuristic (instant, free, no LLM in v1). */
export const getSwapMealPlanGenerator = (): MealPlanGenerator => heuristicMealPlanGenerator;
