import type { Meal } from "@/lib/api";

import { toSlotLabel } from "./MealEditor";
import type { LocalMeal } from "./fuel-store";

const NA = "—";

export type DetailMicro = { readonly label: string; readonly value: string };

/** Meal for the detail sheet: the API shape, or a minimal one rebuilt from a Fuel row. */
export const mealOf = (row: LocalMeal): Meal =>
  row.detail ?? {
    id: row.id,
    name: row.name,
    mealSlot: row.slot as Meal["mealSlot"],
    kcal: row.calories,
    proteinG: row.proteinG,
    carbsG: 0,
    fatG: 0,
    eatenAt: row.eatenAt ?? Date.now(),
    mediaId: null,
    createdAt: row.eatenAt ?? Date.now(),
  };

const fmt = (n: number | null | undefined, unit: string, fixed = 0): string =>
  n == null ? NA : `${fixed ? n.toFixed(fixed) : Math.round(n)}${unit}`;

/** Only micros the analysis actually produced; empty when none. */
export const microsOf = (m: Meal): readonly DetailMicro[] =>
  [
    { label: "Fiber", value: fmt(m.fiberG, " g", 1), has: m.fiberG != null },
    { label: "Sugar", value: fmt(m.sugarG, " g", 1), has: m.sugarG != null },
    { label: "Sodium", value: fmt(m.sodiumMg, " mg"), has: m.sodiumMg != null },
  ]
    .filter((x) => x.has)
    .map(({ label, value }) => ({ label, value }));

export const slotLabelOf = (m: Meal): string => toSlotLabel(m.mealSlot);

export const ingredientMeta = (i: NonNullable<Meal["ingredients"]>[number]): string => {
  const parts = [
    i.grams != null ? `${Math.round(i.grams)} g` : null,
    i.kcal != null ? `${Math.round(i.kcal)} kcal` : null,
  ].filter((p): p is string => p !== null);
  return parts.join(" · ");
};
