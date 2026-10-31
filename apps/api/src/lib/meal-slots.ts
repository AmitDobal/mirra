import type { MealSlot } from "@mirra/contracts";

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
