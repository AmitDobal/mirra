import type {
  MealEstimateInput,
  MealEstimateResult,
  MealEstimator,
} from "../ports/meal-estimator";

/** Offline / no-key fallback — rough macros from keywords in the description. */
export const heuristicMealEstimator: MealEstimator = {
  estimate: async (input: MealEstimateInput): Promise<MealEstimateResult> => {
    const text = (input.description ?? "").toLowerCase();
    let kcal = 420;
    let proteinG = 28;
    let carbsG = 35;
    let fatG = 14;
    let name = "Snap meal (review)";

    if (/chicken|turkey|egg|protein|greek yogurt|tuna|salmon|beef/.test(text)) {
      proteinG = 40;
      kcal = 480;
      name = "Protein-forward plate";
    }
    if (/rice|oat|pasta|bread|bagel|potato/.test(text)) {
      carbsG = 55;
      kcal += 80;
    }
    if (/salad|veg|broccoli|asparagus|greens/.test(text)) {
      kcal = Math.max(220, kcal - 80);
      fatG = 8;
      name = "Veg-forward plate";
    }
    if (/burger|pizza|fries|dessert|ice cream|shake/.test(text)) {
      kcal = 650;
      fatG = 28;
      carbsG = 60;
      proteinG = 22;
      name = "Higher-energy meal";
    }
    if (input.imageDataUrl && !text) {
      name = "Photo meal (heuristic)";
      kcal = 450;
      proteinG = 30;
    }

    return {
      name,
      kcal,
      proteinG,
      carbsG,
      fatG,
      confidence: text ? 0.45 : 0.25,
      notes: "Estimate without vision model — edit if needed.",
      source: "heuristic",
    };
  },
};
