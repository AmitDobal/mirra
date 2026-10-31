import type { PlannedMeal, Recipe } from "@mirra/contracts";

import { FOODS_BY_ID, type FoodRole } from "../data/vetted-foods";

/** Template recipe built from the planned ingredients. Free, offline, never wrong about macros. */

const roleOf = (foodId: string): FoodRole | null => FOODS_BY_ID.get(foodId)?.roles[0] ?? null;

const names = (meal: PlannedMeal, role: FoodRole): string[] =>
  meal.items.filter((i) => roleOf(i.foodId) === role).map((i) => i.name.toLowerCase());

const list = (items: string[]): string =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

export const staticRecipeSteps = (meal: PlannedMeal): string[] => {
  const steps: string[] = [];
  const proteins = names(meal, "protein");
  const carbs = names(meal, "carb");
  const veg = [...names(meal, "veg"), ...names(meal, "fruit")];
  const fats = names(meal, "fat");
  const dairy = names(meal, "dairy");

  steps.push("Weigh each ingredient to the portions listed so the macros stay on target.");
  if (carbs.length) steps.push(`Cook the ${list(carbs)} as you like. Keep it simple: boil, steam or toast.`);
  if (proteins.length)
    steps.push(`Season and cook the ${list(proteins)} until done. Use a little of your fat portion for the pan.`);
  if (veg.length) steps.push(`Wash and chop the ${list(veg)}. Serve raw, steamed or roasted.`);
  if (fats.length) steps.push(`Add the ${list(fats)} at the end so you measure it exactly.`);
  if (dairy.length) steps.push(`Add the ${list(dairy)} cold, on the side or on top.`);
  if (steps.length === 1) steps.push(`Prepare ${meal.title} the way you usually do and keep to the portions.`);
  steps.push("Plate it, taste, and adjust with salt, pepper or herbs.");
  return steps;
};

export const buildStaticRecipe = (meal: PlannedMeal): Recipe => ({
  title: meal.title,
  prepMinutes: 5 + 3 * meal.items.length,
  cookMinutes: names(meal, "protein").length ? 15 : 8,
  ingredients: meal.items.map((i) => ({ name: i.name, grams: i.grams, unitLabel: i.unitLabel })),
  steps: staticRecipeSteps(meal),
  source: "heuristic",
});
