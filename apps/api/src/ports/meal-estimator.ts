/** Estimate meal macros from a photo and/or short description (Cal AI–style). */

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
  confidence: number;
  notes?: string;
  source: "openai" | "heuristic";
};

export type MealEstimator = {
  estimate: (input: MealEstimateInput) => Promise<MealEstimateResult>;
};
