import type { ReviseItem } from "@mirra/contracts";

import type { PlanReviseIntent } from "../../ports/plan-reviser";
import { planMealPrefs, type MealPrefsPlan } from "../meal-revise";
import { reviseEquipment, sameList, snapSessionMinutes } from "../prefs-revise";
import type { ReviseState } from "./context";

export type PrefsStepResult = {
  /** preferences columns to upsert on apply. */
  patch: Record<string, unknown>;
  /** `pref` + `meals_per_day` rows. */
  items: ReviseItem[];
  warnings: string[];
  alreadyNotes: string[];
  meal: MealPrefsPlan | null;
  nextEquipment: string[];
  /** Default session length change (the workout step adds the dropped moves). */
  sessionDefault: { before: number; after: number } | null;
};

const gear = (xs: readonly string[]): string[] => xs.map((x) => x.replace(/_/g, " "));

/** Pure: preference side of a proposal with explicit Avoid / Diet / Add gear / Remove gear rows. */
export const prefsStep = (
  state: ReviseState,
  intent: PlanReviseIntent,
  opts: { doMeal: boolean; doWorkout: boolean },
): PrefsStepResult => {
  const out: PrefsStepResult = {
    patch: {},
    items: [],
    warnings: [],
    alreadyNotes: [],
    meal: null,
    nextEquipment: state.equipment,
    sessionDefault: null,
  };
  if (opts.doMeal) {
    const meal = planMealPrefs({
      intent,
      prefs: state.prefs,
      dietTags: state.dietTags,
      foodsAvoid: state.foodsAvoid,
      cuisineStyles: state.cuisineStyles,
      plan: state.mealPlan,
    });
    Object.assign(out.patch, meal.patch);
    out.items.push(...meal.items);
    out.warnings.push(...meal.warnings);
    out.alreadyNotes.push(...meal.alreadyNotes);
    out.meal = meal;
  }
  if (!opts.doWorkout) return out;

  const before = state.equipment;
  const next = reviseEquipment(before, intent);
  out.nextEquipment = next;
  if (!sameList(next, before)) {
    out.patch.equipmentJson = JSON.stringify(next);
    const had = (g: string) => before.includes(g) || before.includes("full_gym");
    const removed = intent.equipmentRemove.filter((g) => had(g) && !next.includes(g));
    const addedGear = next.filter((g) => !before.includes(g) && intent.equipmentAdd.includes(g));
    if (addedGear.length > 0) {
      out.items.push({ id: "pref:equipment_add", kind: "pref", op: "equipment_add", label: "Add gear", items: gear(addedGear), tags: [], reason: null });
    }
    if (removed.length > 0) {
      out.items.push({ id: "pref:equipment_remove", kind: "pref", op: "equipment_remove", label: "Remove gear", items: gear(removed), tags: [], reason: null });
    }
  }
  if (intent.shortenMin != null) {
    const current = state.prefs?.sessionMinutes ?? 45;
    const minutes = snapSessionMinutes(intent.shortenMin);
    if (minutes < current) {
      out.patch.sessionMinutes = minutes;
      out.sessionDefault = { before: current, after: minutes };
    }
  }
  return out;
};
