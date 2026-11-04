import type { Delta, MealSnap } from "@mirra/contracts";

/**
 * Deterministic proposal tags + reason lines (arch §8.5). The server computes these,
 * never AI free text. Pure, so the assert scripts can load it directly.
 */

const MINUS = "−";
const round = (n: number): number => Math.round(n);
const round1 = (n: number): number => Math.round(n * 10) / 10;

export const mealDelta = (before: MealSnap, after: MealSnap): Delta => ({
  kcal: round(after.kcal - before.kcal),
  proteinG: round1(after.proteinG - before.proteinG),
  carbsG: round1(after.carbsG - before.carbsG),
  fatG: round1(after.fatG - before.fatG),
});

const signed = (n: number, unit: string): string => `${n < 0 ? MINUS : "+"}${Math.abs(round(n))}${unit}`;

/**
 * "Target intact" when |Δkcal| ≤ 5% of the slot budget, else "+120 kcal" / "−120 kcal".
 * Adds "High protein" when Δprotein ≥ +10 g. Max 2 tags.
 */
export const mealSwapTags = (delta: Delta, budgetKcal: number): string[] => {
  const tags = [
    Math.abs(delta.kcal) <= Math.max(1, budgetKcal) * 0.05 ? "Target intact" : signed(delta.kcal, " kcal"),
  ];
  if (delta.proteinG >= 10) tags.push("High protein");
  return tags.slice(0, 2);
};

/** "−35g carbs · +10g protein · 490 kcal": the two biggest macro moves (≥3 g), then after kcal. */
export const mealSwapReason = (delta: Delta, after: MealSnap): string => {
  const moves = (
    [
      ["protein", delta.proteinG],
      ["carbs", delta.carbsG],
      ["fat", delta.fatG],
    ] as const
  )
    .filter(([, g]) => Math.abs(g) >= 3)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 2)
    .map(([name, g]) => `${signed(g, "g")} ${name}`);
  return [...moves, `${round(after.kcal)} kcal`].join(" · ");
};

/** Reason for a new / dropped meal: "520 kcal · 38g protein". */
export const mealSnapReason = (m: MealSnap): string =>
  `${round(m.kcal)} kcal · ${round(m.proteinG)}g protein`;

/** Exercise rows: AI reason when given, else "Trains <focus>" from the workout. */
export const exerciseReason = (aiReason: string | undefined, focus: string | null): string | null =>
  aiReason ?? (focus ? `Trains ${focus.toLowerCase()}` : null);
