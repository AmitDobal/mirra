import type { MealSlot } from "@mirra/contracts";

import { FOODS_BY_ID, type CatalogRow, type FoodRole } from "../data/vetted-foods";
import { clampGrams, slotBudgets } from "../lib/meal-macros";
import type {
  MealPlanDraftMeal,
  MealPlanGenerator,
  MealPlanInput,
} from "../ports/meal-plan-generator";

/** FNV-1a — small deterministic string hash. */
const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const lowerFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);

const titleFor = (names: string[]): string => {
  if (names.length === 1) return names[0]!;
  const rest = names.slice(1).map(lowerFirst);
  return `${names[0]} with ${rest.length > 1 ? `${rest.slice(0, -1).join(", ")} & ${rest.at(-1)}` : rest[0]}`;
};

/** Role template per slot. `fat` is added only when the slot budget is large enough. */
const roleTemplate = (slot: MealSlot, budgetKcal: number, flip: boolean): FoodRole[] => {
  switch (slot) {
    case "breakfast":
      return budgetKcal >= 500 ? ["protein", "carb", "fruit", "fat"] : ["protein", "carb", "fruit"];
    case "lunch":
      return budgetKcal >= 550 ? ["protein", "carb", "veg", "fat"] : ["protein", "carb", "veg"];
    case "dinner":
      return budgetKcal >= 600 ? ["protein", "carb", "veg", "fat"] : ["protein", "carb", "veg"];
    case "snack":
      return flip ? ["protein", "fat"] : ["protein", "fruit"];
  }
};

type Picker = (slot: MealSlot, role: FoodRole, used: Set<string>) => CatalogRow | null;

const makePicker = (input: MealPlanInput): Picker => {
  const avoid = new Set(input.avoidFoodIds);
  const recent = new Set(input.recentFoodIds);
  const dayUsed = new Set<string>();
  return (slot, role, used) => {
    const base = input.catalog.filter(
      (r) =>
        r.slots.includes(slot) &&
        r.roles.includes(role) &&
        !used.has(r.id) &&
        // Only the protein role may use protein foods (keeps salmon out of "fat", etc.).
        (role === "protein" || role === "dairy" || !r.roles.includes("protein")),
    );
    const tiers = [
      base.filter((r) => !avoid.has(r.id) && !recent.has(r.id) && !dayUsed.has(r.id)),
      base.filter((r) => !avoid.has(r.id) && !recent.has(r.id)),
      base.filter((r) => !avoid.has(r.id)),
      base,
    ];
    const pool = tiers.find((t) => t.length > 0);
    if (!pool) return null;
    const h = hash(`${input.userId}|${input.date}|${input.seed ?? ""}|${slot}|${role}`);
    const chosen = pool[h % pool.length]!;
    dayUsed.add(chosen.id);
    return chosen;
  };
};

const perGram = (id: string) => FOODS_BY_ID.get(id)!.per100g.kcal / 100;

/**
 * Size a meal: protein hits ~85% of the slot protein budget, small foods take one
 * unit, and the carb/fruit (or protein, when it is the only flex) fills the remaining
 * kcal. The server fit pass then lands the final ±8%.
 */
const draftSlot = (
  slot: MealSlot,
  budget: { kcal: number; proteinG: number; carbsG: number },
  pick: Picker,
  flip: boolean,
): MealPlanDraftMeal | null => {
  const used = new Set<string>();
  const picked: { role: FoodRole; id: string; grams: number }[] = [];
  for (const role of roleTemplate(slot, budget.kcal, flip)) {
    const row = pick(slot, role, used);
    if (!row) continue;
    used.add(row.id);
    const f = FOODS_BY_ID.get(row.id)!;
    const fixed = role === "fat" ? f.unit.grams * 0.75 : f.unit.grams;
    picked.push({ role, id: row.id, grams: clampGrams(f, fixed) });
  }
  if (picked.length === 0) return null;

  const protein = picked.find((p) => p.role === "protein");
  const flex =
    picked.find((p) => p.role === "carb") ?? picked.find((p) => p.role === "fruit") ?? protein ?? picked[0]!;
  if (protein && protein !== flex) {
    const f = FOODS_BY_ID.get(protein.id)!;
    protein.grams = clampGrams(f, (budget.proteinG * 0.85) / Math.max(f.per100g.proteinG / 100, 0.01));
  }
  const others = picked.filter((p) => p !== flex).reduce((s, p) => s + p.grams * perGram(p.id), 0);
  flex.grams = clampGrams(FOODS_BY_ID.get(flex.id)!, (budget.kcal - others) / perGram(flex.id));

  return {
    slot,
    title: titleFor(picked.map((p) => FOODS_BY_ID.get(p.id)!.name)),
    items: picked.map((p) => ({ foodId: p.id, grams: p.grams })),
  };
};

/** Deterministic, key-free generator. Also the fallback for every OpenAI failure. */
export const heuristicMealPlanGenerator: MealPlanGenerator = {
  generate: async (input) => {
    const budgets = slotBudgets(input.remaining, input.slots);
    const pick = makePicker(input);
    const flip = hash(`${input.userId}|${input.date}|${input.seed ?? ""}|snack`) % 2 === 0;
    const meals: MealPlanDraftMeal[] = [];
    for (const slot of input.slots) {
      const budget = budgets[slot];
      if (!budget) continue;
      const meal = draftSlot(slot, budget, pick, flip);
      if (meal) meals.push(meal);
    }
    return { meals, source: "heuristic" };
  },
};
