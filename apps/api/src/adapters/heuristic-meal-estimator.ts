import type {
  MealEstimateInput,
  MealEstimateResult,
  MealEstimator,
} from "../ports/meal-estimator";

type Profile = Pick<
  MealEstimateResult,
  "name" | "kcal" | "proteinG" | "carbsG" | "fatG" | "fiberG" | "sugarG" | "sodiumMg"
>;

const GENERIC_WARNING = "Rough estimate without a vision model. Check portions and edit if needed.";

/** Offline / no-key fallback. Rough macros from keywords in the description. */
export const heuristicMealEstimator: MealEstimator = {
  estimate: async (input: MealEstimateInput): Promise<MealEstimateResult> => {
    const text = (input.description ?? "").toLowerCase();
    const p: Profile = {
      name: "Snap meal (review)",
      kcal: 420,
      proteinG: 28,
      carbsG: 35,
      fatG: 14,
      fiberG: 5,
      sugarG: 6,
      sodiumMg: 600,
    };
    const warnings: string[] = [GENERIC_WARNING];
    const ingredients: MealEstimateResult["ingredients"] = [];

    if (/chicken|turkey|egg|protein|greek yogurt|tuna|salmon|beef/.test(text)) {
      p.proteinG = 40;
      p.kcal = 480;
      p.name = "Protein-forward plate";
      ingredients.push({ name: "Lean protein", grams: 150, kcal: 250, proteinG: 35, carbsG: 0, fatG: 8, confidence: 0.4 });
    }
    if (/rice|oat|pasta|bread|bagel|potato/.test(text)) {
      p.carbsG = 55;
      p.kcal += 80;
      p.fiberG = 4;
      ingredients.push({ name: "Starch side", grams: 180, kcal: 230, proteinG: 5, carbsG: 48, fatG: 1, confidence: 0.4 });
    }
    if (/salad|veg|broccoli|asparagus|greens/.test(text)) {
      p.kcal = Math.max(220, p.kcal - 80);
      p.fatG = 8;
      p.fiberG = 8;
      p.sugarG = 5;
      p.name = "Veg-forward plate";
      ingredients.push({ name: "Vegetables", grams: 150, kcal: 60, proteinG: 3, carbsG: 10, fatG: 1, confidence: 0.4 });
    }
    if (/burger|pizza|fries|dessert|ice cream|shake/.test(text)) {
      Object.assign(p, {
        kcal: 650,
        fatG: 28,
        carbsG: 60,
        proteinG: 22,
        fiberG: 3,
        sugarG: 18,
        sodiumMg: 1100,
        name: "Higher-energy meal",
      });
      warnings.push("Higher in sodium and sugar than a typical plate.");
      ingredients.push({ name: "Main dish", grams: 300, kcal: 650, proteinG: 22, carbsG: 60, fatG: 28, confidence: 0.35 });
    }
    if (input.imageDataUrl && !text) {
      p.name = "Photo meal (heuristic)";
      p.kcal = 450;
      p.proteinG = 30;
    }
    if (ingredients.length === 0) {
      ingredients.push({
        name: text ? "Mixed plate" : "Meal from photo",
        kcal: p.kcal,
        proteinG: p.proteinG,
        carbsG: p.carbsG,
        fatG: p.fatG,
        confidence: 0.25,
      });
    }

    return {
      ...p,
      ingredients,
      warnings,
      confidence: text ? 0.45 : 0.25,
      notes: "Estimate without vision model. Edit if needed.",
      source: "heuristic",
    };
  },
};
