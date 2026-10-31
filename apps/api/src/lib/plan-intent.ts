import { CUISINE_STYLE_IDS } from "@mirra/contracts";

import type { PlanReviseIntent } from "../ports/plan-reviser";

export const EQUIPMENT_IDS = [
  "full_gym",
  "dumbbells",
  "barbell",
  "machines",
  "cables",
  "bands",
  "bodyweight",
  "home_minimal",
  "bench",
] as const;

export const emptyIntent = (): PlanReviseIntent => ({
  equipmentAdd: [],
  equipmentRemove: [],
  foodsAvoidAdd: [],
  dietTagsAdd: [],
  cuisineStylesAdd: [],
  forceMealRegen: false,
  reviseWorkout: false,
});

const uniq = (xs: string[]): string[] => [...new Set(xs)];

/** Clamp model/heuristic output to known ids and sane numbers. */
export const sanitizeIntent = (raw: Partial<PlanReviseIntent>): PlanReviseIntent => {
  const known = new Set<string>(EQUIPMENT_IDS);
  const equip = (xs?: string[]) => uniq((xs ?? []).filter((x) => known.has(x)));
  const words = (xs?: string[]) =>
    uniq(
      (xs ?? [])
        .map((x) => x.toLowerCase().replace(/[^a-z ]/g, "").trim())
        .filter((x) => x.length >= 3 && x.length <= 30),
    ).slice(0, 8);
  const shorten =
    typeof raw.shortenMin === "number" && Number.isFinite(raw.shortenMin)
      ? Math.min(90, Math.max(10, Math.round(raw.shortenMin)))
      : undefined;
  return {
    equipmentAdd: equip(raw.equipmentAdd),
    equipmentRemove: equip(raw.equipmentRemove),
    foodsAvoidAdd: words(raw.foodsAvoidAdd),
    dietTagsAdd: uniq(
      (raw.dietTagsAdd ?? []).filter((t) =>
        ["vegetarian", "vegan", "dairy_free", "gluten_free", "halal", "high_protein"].includes(t),
      ),
    ),
    cuisineStylesAdd: uniq(
      (raw.cuisineStylesAdd ?? []).filter((c) => (CUISINE_STYLE_IDS as readonly string[]).includes(c)),
    ),
    ...(raw.cuisineStylesOnly ? { cuisineStylesOnly: true } : {}),
    forceMealRegen: Boolean(raw.forceMealRegen),
    reviseWorkout: Boolean(raw.reviseWorkout),
    ...(raw.preferBench ? { preferBench: true } : {}),
    ...(shorten ? { shortenMin: shorten } : {}),
  };
};

export const hasMealIntent = (i: PlanReviseIntent): boolean =>
  i.forceMealRegen ||
  i.foodsAvoidAdd.length > 0 ||
  i.dietTagsAdd.length > 0 ||
  i.cuisineStylesAdd.length > 0;

export const hasWorkoutIntent = (i: PlanReviseIntent): boolean =>
  i.reviseWorkout ||
  i.equipmentAdd.length > 0 ||
  i.equipmentRemove.length > 0 ||
  Boolean(i.preferBench) ||
  i.shortenMin != null;

export const hasAnyIntent = (i: PlanReviseIntent): boolean =>
  hasMealIntent(i) || hasWorkoutIntent(i);
