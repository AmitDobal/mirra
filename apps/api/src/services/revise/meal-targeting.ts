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

type Totals = { kcal: number; proteinG: number; carbsG: number };
type Candidate = { title: string; meal: { totals: Totals } };
/** The dish being replaced: its name and macros (the bias must beat these). */
export type CurrentMeal = { title: string } & Totals;

const score = (c: Candidate, bias: PlanReviseMealBias | undefined): number => {
  if (bias === "high_protein") return c.meal.totals.proteinG;
  if (bias === "low_carb") return -c.meal.totals.carbsG;
  if (bias === "lighter") return -c.meal.totals.kcal;
  return 0;
};

/**
 * Does `after` actually deliver the bias against `before`? Strictly: more protein, fewer
 * carbs, fewer kcal. A "higher protein" swap that lands on less protein is never offered.
 */
export const meetsBias = (before: Totals, after: Totals, bias: PlanReviseMealBias | undefined): boolean => {
  if (bias === "high_protein") return after.proteinG > before.proteinG;
  if (bias === "low_carb") return after.carbsG < before.carbsG;
  if (bias === "lighter") return after.kcal < before.kcal;
  return true;
};

/** User-facing bias words for warnings ("a higher-protein lunch"). */
export const BIAS_LABEL: Record<PlanReviseMealBias, string> = {
  high_protein: "higher-protein",
  low_carb: "lower-carb",
  lighter: "lighter",
};

/**
 * Best candidate for one slot: a different dish than the current one and not already
 * picked for another slot. With a bias, only dishes that beat the current one on it qualify
 * (null when none does), then the bias ranks them. Ties keep generator order, so no bias =
 * the first fresh dish.
 */
export const pickCandidate = <T extends Candidate>(
  candidates: readonly T[],
  bias: PlanReviseMealBias | undefined,
  current: CurrentMeal,
  used: ReadonlySet<string>,
): T | null => {
  const ok = candidates.filter((c) => c.title !== current.title && meetsBias(current, c.meal.totals, bias));
  const fresh = ok.filter((c) => !used.has(c.title));
  const pool = fresh.length > 0 ? fresh : ok;
  if (pool.length === 0) return null;
  return pool.reduce((best, c) => (score(c, bias) > score(best, bias) ? c : best), pool[0]!);
};
