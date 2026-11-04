import type { MealSlot, PlannedMeal } from "@mirra/contracts";

import type { PlanReviseMealBias } from "../../ports/plan-reviser";

/**
 * Pure slot targeting (arch §8.4). Order: `context.mealItemId` wins, then the slots the
 * user named, then every open slot only for whole-day asks. Food-pref changes add the
 * planned slots that contain a newly banned food. "Swap my lunch" touches lunch only.
 */

export type MealTargets = {
  wholeDay: boolean;
  /** Planned meals to redraft (empty for whole-day). */
  targets: PlannedMeal[];
  warnings: string[];
};

type TargetArgs = {
  meals: readonly PlannedMeal[];
  mealItemId?: string;
  mealSlots: readonly MealSlot[];
  /** Meals-per-day change, cuisine switch or "new meals today" with no slot named. */
  wholeDay: boolean;
  /** Foods the new prefs ban (null = food prefs unchanged). */
  banned: ReadonlySet<string> | null;
};

const LABEL: Record<MealSlot, string> = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner" };

export const targetMeals = (a: TargetArgs): MealTargets => {
  const warnings: string[] = [];
  const planned = a.meals.filter((m) => m.status === "planned");

  if (a.mealItemId) {
    const item = a.meals.find((m) => m.id === a.mealItemId);
    if (item?.status === "planned") return { wholeDay: false, targets: [item], warnings };
    warnings.push(item ? `${LABEL[item.slot]} is already ${item.status}` : "That meal is no longer in your plan");
    return { wholeDay: false, targets: [], warnings };
  }

  if (a.wholeDay) return { wholeDay: true, targets: [], warnings };

  const picked = new Map<string, PlannedMeal>();
  for (const slot of a.mealSlots) {
    const item = planned.find((m) => m.slot === slot);
    if (item) picked.set(item.id, item);
    else {
      const other = a.meals.find((m) => m.slot === slot);
      warnings.push(other ? `${LABEL[slot]} is already ${other.status}` : `No ${slot} planned today`);
    }
  }
  if (a.banned && a.banned.size > 0) {
    for (const m of planned) {
      if (m.items.some((i) => a.banned!.has(i.foodId))) picked.set(m.id, m);
    }
  }
  const order: readonly MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];
  const targets = [...picked.values()].sort((x, y) => order.indexOf(x.slot) - order.indexOf(y.slot));
  return { wholeDay: false, targets, warnings };
};

type Candidate = { title: string; meal: { totals: { kcal: number; proteinG: number; carbsG: number } } };

const score = (c: Candidate, bias: PlanReviseMealBias | undefined): number => {
  if (bias === "high_protein") return c.meal.totals.proteinG;
  if (bias === "low_carb") return -c.meal.totals.carbsG;
  if (bias === "lighter") return -c.meal.totals.kcal;
  return 0;
};

/**
 * Best candidate for one slot: a different dish than the current one and not already
 * picked for another slot; the bias (more protein, fewer carbs, lighter) ranks the rest.
 * Ties keep generator order, so no bias = the first fresh dish.
 */
export const pickCandidate = <T extends Candidate>(
  candidates: readonly T[],
  bias: PlanReviseMealBias | undefined,
  currentTitle: string,
  used: ReadonlySet<string>,
): T | null => {
  const fresh = candidates.filter((c) => c.title !== currentTitle && !used.has(c.title));
  const pool = fresh.length > 0 ? fresh : candidates.filter((c) => c.title !== currentTitle);
  if (pool.length === 0) return null;
  return pool.reduce((best, c) => (score(c, bias) > score(best, bias) ? c : best), pool[0]!);
};
