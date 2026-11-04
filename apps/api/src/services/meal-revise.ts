import type { DayMealPlan, ReviseItem } from "@mirra/contracts";

import type { preferences } from "../db/schema";
import { filterCatalog } from "../lib/meal-diet";
import { normalizeMealsPerDay, slotsForMealCount } from "../lib/meal-slots";
import type { PlanReviseIntent } from "../ports/plan-reviser";
import { reviseCuisines, reviseDietTags, reviseFoodsAvoid, sameList } from "./prefs-revise";

type PrefsRow = typeof preferences.$inferSelect;

const SLOT_NAMES: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};
const mealsLabel = (n: number): string => `${n} meal${n === 1 ? "" : "s"} a day`;
const slotNames = (n: number): string => slotsForMealCount(n).map((s) => SLOT_NAMES[s]).join(", ");
const human = (xs: readonly string[]): string[] => xs.map((x) => x.replace(/_/g, " "));
const added = (next: readonly string[], prev: readonly string[]): string[] =>
  next.filter((x) => !prev.includes(x));
const avoidWords = (s: string | null): string[] =>
  (s ?? "")
    .split(/[,;\n]+/)
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);

/** Food prefs after this revision (feed the in-memory meal draft before anything is saved). */
export type NextFoodPrefs = { dietTags: string[]; foodsAvoid: string | null; cuisines: string[] };

export type MealPrefsPlan = {
  patch: Record<string, unknown>;
  /** `pref` (Avoid / Diet / Prefer / Only cuisine) and `meals_per_day` rows. */
  items: ReviseItem[];
  warnings: string[];
  /** Coach copy when the request is already satisfied. */
  alreadyNotes: string[];
  foodsChanged: boolean;
  mealsChanged: boolean;
  /** Meals-per-day after this revision (saved pref or default). */
  mealCount: number;
  /** Meals-per-day before this revision. */
  mealCountBefore: number;
  next: NextFoodPrefs;
};

type PlanArgs = {
  intent: PlanReviseIntent;
  prefs: PrefsRow | undefined;
  dietTags: string[];
  foodsAvoid: string | null;
  cuisineStyles: string[];
  plan: DayMealPlan | null;
};

const pref = (
  op: Extract<ReviseItem, { kind: "pref" }>["op"],
  label: string,
  items: string[],
): ReviseItem => ({ id: `pref:${op}`, kind: "pref", op, label, items, tags: [], reason: null });

/** Pure: which preference edits (food limits, cuisines, meals per day) this intent implies. */
export const planMealPrefs = (a: PlanArgs): MealPrefsPlan => {
  const { intent } = a;
  const mealCount = normalizeMealsPerDay(a.prefs?.mealsPerDay);
  const out: MealPrefsPlan = {
    patch: {},
    items: [],
    warnings: [],
    alreadyNotes: [],
    foodsChanged: false,
    mealsChanged: false,
    mealCount,
    mealCountBefore: mealCount,
    next: { dietTags: a.dietTags, foodsAvoid: a.foodsAvoid, cuisines: a.cuisineStyles },
  };

  const nextDiet = reviseDietTags(a.dietTags, intent.dietTagsAdd);
  const nextAvoid = reviseFoodsAvoid(a.foodsAvoid, intent.foodsAvoidAdd);
  const nextCuisines = reviseCuisines(a.cuisineStyles, intent.cuisineStylesAdd, intent.cuisineStylesOnly);
  const foodIntent =
    intent.dietTagsAdd.length > 0 || intent.foodsAvoidAdd.length > 0 || intent.cuisineStylesAdd.length > 0;
  if (foodIntent) {
    if (filterCatalog(nextDiet, nextAvoid, nextCuisines, a.prefs?.lifestyleNotes).length === 0) {
      out.warnings.push("Those food limits leave nothing to eat, so meal prefs stay as they are");
    } else if (
      !sameList(nextDiet, a.dietTags) ||
      nextAvoid !== a.foodsAvoid ||
      !sameList(nextCuisines, a.cuisineStyles)
    ) {
      out.foodsChanged = true;
      out.next = { dietTags: nextDiet, foodsAvoid: nextAvoid, cuisines: nextCuisines };
      out.patch.dietTagsJson = JSON.stringify(nextDiet);
      out.patch.foodsAvoid = nextAvoid;
      out.patch.cuisineJson = JSON.stringify(nextCuisines);
      const newAvoid = added(avoidWords(nextAvoid), avoidWords(a.foodsAvoid));
      if (newAvoid.length > 0) out.items.push(pref("avoid", "Avoid", newAvoid));
      const newDiet = added(nextDiet, a.dietTags);
      if (newDiet.length > 0) out.items.push(pref("diet_tag", "Diet", human(newDiet)));
      if (!sameList(nextCuisines, a.cuisineStyles)) {
        out.items.push(
          intent.cuisineStylesOnly
            ? pref("cuisine_only", "Only cuisine", human(nextCuisines))
            : pref("prefer", "Prefer", human(added(nextCuisines, a.cuisineStyles))),
        );
      }
    }
  }

  if (intent.mealsPerDay != null) {
    const target = normalizeMealsPerDay(intent.mealsPerDay);
    const allowed = slotsForMealCount(target);
    const stale = a.plan?.meals.some((m) => m.status === "planned" && !allowed.includes(m.slot)) ?? false;
    if (target !== mealCount) {
      out.patch.mealsPerDay = target;
      out.mealsChanged = true;
      out.items.push({
        id: "meals_per_day",
        kind: "meals_per_day",
        before: mealCount,
        after: target,
        tags: [],
        reason: `${mealsLabel(target)}: ${slotNames(target)}`,
      });
      out.mealCount = target;
    } else if (stale) {
      // Preference already matches but today's plan still has extra slots: rebuild only.
      out.mealsChanged = true;
    } else {
      out.alreadyNotes.push(`You're already set to ${mealsLabel(target)} (${slotNames(target)}). Nothing to change.`);
    }
  }
  return out;
};
