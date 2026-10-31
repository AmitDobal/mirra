import type { Macros, MealSlot } from "@mirra/contracts";

import type { CatalogRow } from "../data/vetted-foods";

/**
 * Meal plan drafting. Generators only pick `foodId` + grams from the catalog;
 * the server validates, clamps and computes macros (never trust model macros).
 */
export type MealPlanDraftMeal = {
  slot: MealSlot;
  title: string;
  items: { foodId: string; grams: number }[];
};

export type MealPlanInput = {
  userId: string;
  /** YYYY-MM-DD */
  date: string;
  targets: Macros;
  /** Equals `targets` on generate; for swap, the macros of the item being replaced. */
  remaining: Macros;
  /** Slots still to plan. */
  slots: MealSlot[];
  /** Pre-filtered by diet / allergy. */
  catalog: CatalogRow[];
  avoidFoodIds: string[];
  /** Foods used in the last 3 days (variety). */
  recentFoodIds: string[];
  /** Extra entropy for rotation (swap / forced regenerate). */
  seed?: string;
};

export type MealPlanResult = {
  meals: MealPlanDraftMeal[];
  source: "openai" | "heuristic";
};

export type MealPlanGenerator = {
  generate: (input: MealPlanInput) => Promise<MealPlanResult>;
};
