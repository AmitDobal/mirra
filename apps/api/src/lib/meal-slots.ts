import type { MealSlot } from "@mirra/contracts";

import { SLOT_ORDER } from "./meal-macros";

/** No preference saved = the original four slots. */
export const DEFAULT_MEALS_PER_DAY = 4;

const SLOTS_BY_COUNT: Record<number, readonly MealSlot[]> = {
  1: ["dinner"],
  2: ["lunch", "dinner"],
  3: ["breakfast", "lunch", "dinner"],
  4: SLOT_ORDER,
};

/** Clamp a stored/parsed meals-per-day value to 1-4 (null/NaN = default). */
export const normalizeMealsPerDay = (n: number | null | undefined): number =>
  typeof n === "number" && Number.isFinite(n)
    ? Math.min(4, Math.max(1, Math.round(n)))
    : DEFAULT_MEALS_PER_DAY;

/** Slots a user with this meals-per-day preference plans, in day order. */
export const slotsForMealCount = (n: number | null | undefined): readonly MealSlot[] =>
  SLOTS_BY_COUNT[normalizeMealsPerDay(n)]!;

/** Below this many remaining kcal, leftover slots are skipped instead of planned. */
export const MIN_REPLAN_KCAL = 150;

/** Smallest sensible meal; open slots are dropped until each gets about this much. */
const MIN_SLOT_KCAL = 400;

/** Drop order when little is left: snack first, dinner last. */
const SLOT_KEEP_PRIORITY: readonly MealSlot[] = ["dinner", "lunch", "breakfast", "snack"];

/**
 * Slots worth planning: none under the min floor, otherwise as many open slots
 * as `remainingKcal` can fill at >= MIN_REPLAN_KCAL each (at least one).
 */
export const pickSlotsToPlan = (open: MealSlot[], remainingKcal: number): MealSlot[] => {
  if (remainingKcal < MIN_REPLAN_KCAL) return [];
  const count = Math.max(1, Math.floor(remainingKcal / MIN_SLOT_KCAL));
  const keep = new Set(SLOT_KEEP_PRIORITY.filter((s) => open.includes(s)).slice(0, count));
  return open.filter((s) => keep.has(s));
};
