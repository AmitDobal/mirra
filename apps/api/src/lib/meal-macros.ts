import type { Macros, MealSlot, PlannedItem } from "@mirra/contracts";

import { FOODS_BY_ID, type VettedFood } from "../data/vetted-foods";

/** Slot kcal must land within ±8% of its budget, else `fit: "approx"`. */
export const FIT_TOLERANCE = 0.08;
/** Display / persistence order of slots inside a day. */
export const SLOT_ORDER: readonly MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];

const SLOT_WEIGHT: Record<MealSlot, number> = {
  breakfast: 0.25,
  lunch: 0.3,
  snack: 0.12,
  dinner: 0.33,
};

export type FoodLine = { foodId: string; grams: number };
export type FitResult = { items: PlannedItem[]; fit: "ok" | "approx" };

const round1 = (n: number): number => Math.round(n * 10) / 10;
const roundTo5 = (n: number): number => Math.round(n / 5) * 5;
const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

export const sumMacros = (rows: Macros[]): Macros =>
  rows.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      proteinG: round1(acc.proteinG + m.proteinG),
      carbsG: round1(acc.carbsG + m.carbsG),
      fatG: round1(acc.fatG + m.fatG),
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

export const subtractMacros = (a: Macros, b: Macros): Macros => ({
  kcal: Math.max(0, a.kcal - b.kcal),
  proteinG: Math.max(0, round1(a.proteinG - b.proteinG)),
  carbsG: Math.max(0, round1(a.carbsG - b.carbsG)),
  fatG: Math.max(0, round1(a.fatG - b.fatG)),
});

/** Split `remaining` across `slots` by fixed weights (normalised over the slots given). */
export const slotBudgets = (
  remaining: Macros,
  slots: MealSlot[],
): Partial<Record<MealSlot, Macros>> => {
  const total = slots.reduce((s, slot) => s + SLOT_WEIGHT[slot], 0);
  const out: Partial<Record<MealSlot, Macros>> = {};
  if (total <= 0) return out;
  for (const slot of slots) {
    const share = SLOT_WEIGHT[slot] / total;
    out[slot] = {
      kcal: Math.round(remaining.kcal * share),
      proteinG: round1(remaining.proteinG * share),
      carbsG: round1(remaining.carbsG * share),
      fatG: round1(remaining.fatG * share),
    };
  }
  return out;
};

export const clampGrams = (f: VettedFood, grams: number): number =>
  clamp(roundTo5(grams), f.minG, f.maxG);

/** Server-side macros for one line. Unknown / disallowed food → null. */
export const materializeItem = (
  line: FoodLine,
  allowed?: ReadonlySet<string>,
): PlannedItem | null => {
  const f = FOODS_BY_ID.get(line.foodId);
  if (!f || (allowed && !allowed.has(f.id))) return null;
  if (!Number.isFinite(line.grams)) return null;
  const grams = clampGrams(f, line.grams);
  const k = grams / 100;
  return {
    foodId: f.id,
    name: f.name,
    grams,
    unitLabel: f.unit.label,
    unitQty: Math.max(0.25, Math.round((grams / f.unit.grams) * 4) / 4),
    kcal: Math.round(f.per100g.kcal * k),
    proteinG: round1(f.per100g.proteinG * k),
    carbsG: round1(f.per100g.carbsG * k),
    fatG: round1(f.per100g.fatG * k),
  };
};

const withinTolerance = (kcal: number, budget: number): boolean =>
  budget > 0 && Math.abs(kcal - budget) <= budget * FIT_TOLERANCE;

/** Primary protein + carb/fruit lines are the only ones the fit pass may scale. */
const scalableIndexes = (lines: FoodLine[]): number[] => {
  const foods = lines.map((l) => FOODS_BY_ID.get(l.foodId)!);
  let p = foods.findIndex((f) => f.roles.includes("protein"));
  if (p < 0) p = foods.findIndex((f) => f.roles.includes("dairy"));
  const c = foods.findIndex(
    (f, i) => i !== p && (f.roles.includes("carb") || f.roles.includes("fruit")),
  );
  const picks = [p, c].filter((i) => i >= 0);
  return picks.length ? picks : [0];
};

const build = (lines: FoodLine[], allowed?: ReadonlySet<string>): PlannedItem[] =>
  lines.map((l) => materializeItem(l, allowed)!);

const totalKcal = (items: PlannedItem[]): number => items.reduce((s, i) => s + i.kcal, 0);

/**
 * Fit pass: scale primary protein/carb grams (within bounds, 5 g steps) so slot
 * kcal lands within ±8% of `budgetKcal`. Otherwise keep the closest and mark approx.
 */
export const fitMeal = (
  input: FoodLine[],
  budgetKcal: number,
  allowed?: ReadonlySet<string>,
): FitResult => {
  let lines = input.map((l) => ({ ...l }));
  const idx = scalableIndexes(lines);

  for (let pass = 0; pass < 4; pass++) {
    const items = build(lines, allowed);
    const total = totalKcal(items);
    if (withinTolerance(total, budgetKcal) || budgetKcal <= 0) break;
    const scalable = idx.reduce((s, i) => s + items[i]!.kcal, 0);
    if (scalable <= 0) break;
    const factor = clamp((budgetKcal - (total - scalable)) / scalable, 0.2, 5);
    lines = lines.map((l, i) =>
      idx.includes(i)
        ? { ...l, grams: clampGrams(FOODS_BY_ID.get(l.foodId)!, l.grams * factor) }
        : l,
    );
  }

  // Hill-climb in 5 g steps for rounding / bound leftovers.
  for (let step = 0; step < 40; step++) {
    const current = totalKcal(build(lines, allowed));
    if (withinTolerance(current, budgetKcal) || budgetKcal <= 0) break;
    let best: { i: number; grams: number; gap: number } | null = null;
    for (const i of idx) {
      const f = FOODS_BY_ID.get(lines[i]!.foodId)!;
      for (const dir of [-5, 5]) {
        const grams = lines[i]!.grams + dir;
        if (grams < f.minG || grams > f.maxG) continue;
        const next = lines.map((l, j) => (j === i ? { ...l, grams } : l));
        const gap = Math.abs(totalKcal(build(next, allowed)) - budgetKcal);
        if (!best || gap < best.gap) best = { i, grams, gap };
      }
    }
    if (!best || best.gap >= Math.abs(current - budgetKcal)) break;
    lines = lines.map((l, j) => (j === best!.i ? { ...l, grams: best!.grams } : l));
  }

  const items = build(lines, allowed);
  return { items, fit: withinTolerance(totalKcal(items), budgetKcal) ? "ok" : "approx" };
};

export type MaterializedMeal = FitResult & { totals: Macros };

/** Validate a draft (unknown ids reject the meal), clamp, compute macros, fit to budget. */
export const materializeMeal = (
  lines: FoodLine[],
  budgetKcal: number,
  allowed?: ReadonlySet<string>,
): MaterializedMeal | null => {
  if (lines.length === 0) return null;
  const seen = new Set<string>();
  const unique: FoodLine[] = [];
  for (const l of lines) {
    if (!materializeItem(l, allowed)) return null;
    if (seen.has(l.foodId)) continue;
    seen.add(l.foodId);
    unique.push(l);
  }
  const fitted = fitMeal(unique, budgetKcal, allowed);
  return { ...fitted, totals: sumMacros(fitted.items) };
};
