import { createOpenAiMealEstimator } from "../adapters/openai-meal-estimator";
import { heuristicMealEstimator } from "../adapters/heuristic-meal-estimator";
import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import type { MealEstimator } from "../ports/meal-estimator";
import { resolveAiProvider } from "./ai/resolve-provider";

export const getMealEstimator = (
  env: MirraEnv,
  db?: AppDB,
  opts?: { forceHeuristic?: boolean },
): MealEstimator => {
  if (opts?.forceHeuristic) return heuristicMealEstimator;
  const tag = resolveAiProvider(env);
  if (tag === "openai") return createOpenAiMealEstimator(env, db);
  return heuristicMealEstimator;
};
