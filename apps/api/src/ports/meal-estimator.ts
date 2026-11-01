/** Estimate meal macros, micros and ingredients from a photo and/or short description (Cal AI–style). v2: AMI-131. */

import type { MealIngredient } from "@mirra/contracts";

export type MealEstimateInput = {
  userId: string;
  /** data URL or https URL for vision models. */
  imageDataUrl?: string;
  /** Free-text description fallback (smoothies, hidden ingredients). */
  description?: string;
};

export type MealEstimateResult = {
  name: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
  ingredients: MealIngredient[];
  /** Wellness notes only. Never a diagnosis. */
  warnings: string[];
  confidence: number;
  notes?: string;
  source: "openai" | "anthropic" | "heuristic";
};

export type MealEstimator = {
  estimate: (input: MealEstimateInput) => Promise<MealEstimateResult>;
};
