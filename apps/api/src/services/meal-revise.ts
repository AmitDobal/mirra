import type { CoachReviseBody, CoachReviseChange, DayMealPlan, MealSlot } from "@mirra/contracts";

import type { preferences } from "../db/schema";
import { todayUtc } from "../lib/dates";
import { ApiError } from "../lib/errors";
import { filterCatalog } from "../lib/meal-diet";
import { slotBudgets } from "../lib/meal-macros";
import { normalizeMealsPerDay, pickSlotsToPlan, slotsForMealCount } from "../lib/meal-slots";
import type { PlanReviseIntent } from "../ports/plan-reviser";
import { generatePlan, getTodayPlan, swapPlannedMeal, type MealPlanCtx } from "./meal-plan";
import { reviseCuisines, reviseDietTags, reviseFoodsAvoid, sameList } from "./prefs-revise";

type PrefsRow = typeof preferences.$inferSelect;

const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

const fmtList = (list: readonly string[]): string => list.join(", ").replace(/_/g, " ") || "none";
const slotNames = (slots: readonly MealSlot[]): string => slots.map((s) => SLOT_LABEL[s]).join(", ");
const mealsLabel = (n: number): string => `${n} meal${n === 1 ? "" : "s"} a day`;
const clip = (s: string, n = 34): string => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** One line per live meal: "Lunch · Chicken & rice · 620 kcal". */
export const mealsText = (plan: DayMealPlan | null): string => {
  const live = plan?.meals.filter((m) => m.status !== "skipped") ?? [];
  if (live.length === 0) return "No meals planned yet";
  return live.map((m) => `${SLOT_LABEL[m.slot]} · ${clip(m.title)} · ${m.kcal} kcal`).join("\n");
};

export type MealPrefsPlan = {
  patch: Record<string, unknown>;
  changes: CoachReviseChange[];
  warnings: string[];
  /** Coach copy when the request is already satisfied. */
  alreadyNotes: string[];
  foodsChanged: boolean;
  mealsChanged: boolean;
  /** Meals-per-day after this revision (saved pref or default). */
  mealCount: number;
};

type PlanArgs = {
  intent: PlanReviseIntent;
  prefs: PrefsRow | undefined;
  dietTags: string[];
  foodsAvoid: string | null;
  cuisineStyles: string[];
  plan: DayMealPlan | null;
};

/** Pure: which preference edits (food limits, meals per day) this intent implies. */
export const planMealPrefs = (a: PlanArgs): MealPrefsPlan => {
  const { intent } = a;
  const out: MealPrefsPlan = {
    patch: {},
    changes: [],
    warnings: [],
    alreadyNotes: [],
    foodsChanged: false,
    mealsChanged: false,
    mealCount: normalizeMealsPerDay(a.prefs?.mealsPerDay),
  };

  const nextDiet = reviseDietTags(a.dietTags, intent.dietTagsAdd);
  const nextAvoid = reviseFoodsAvoid(a.foodsAvoid, intent.foodsAvoidAdd);
  const nextCuisines = reviseCuisines(a.cuisineStyles, intent.cuisineStylesAdd, intent.cuisineStylesOnly);
  const foodIntent =
    intent.dietTagsAdd.length > 0 || intent.foodsAvoidAdd.length > 0 || intent.cuisineStylesAdd.length > 0;
  if (foodIntent) {
    if (filterCatalog(nextDiet, nextAvoid, nextCuisines, a.prefs?.lifestyleNotes).length === 0) {
      out.warnings.push("Those food limits leave nothing to eat; meal prefs unchanged");
    } else if (
      !sameList(nextDiet, a.dietTags) ||
      nextAvoid !== a.foodsAvoid ||
      !sameList(nextCuisines, a.cuisineStyles)
    ) {
      out.foodsChanged = true;
      out.patch.dietTagsJson = JSON.stringify(nextDiet);
      out.patch.foodsAvoid = nextAvoid;
      out.patch.cuisineJson = JSON.stringify(nextCuisines);
      if (!sameList(nextCuisines, a.cuisineStyles)) {
        out.changes.push({
          kind: "cuisine_styles",
          area: "meal",
          before: fmtList(a.cuisineStyles),
          after: fmtList(nextCuisines),
          summary: `Cuisines: ${fmtList(nextCuisines)}`,
        });
      }
      if (!sameList(nextDiet, a.dietTags)) {
        out.changes.push({
          kind: "diet_tags",
          area: "meal",
          before: fmtList(a.dietTags),
          after: fmtList(nextDiet),
          summary: `Diet: ${fmtList(nextDiet)}`,
        });
      }
      if (nextAvoid !== a.foodsAvoid) {
        out.changes.push({
          kind: "foods_avoid",
          area: "meal",
          before: a.foodsAvoid ?? "nothing",
          after: nextAvoid ?? "nothing",
          summary: `Avoiding: ${nextAvoid ?? "nothing"}`,
        });
      }
    }
  }

  if (intent.mealsPerDay != null) {
    const target = normalizeMealsPerDay(intent.mealsPerDay);
    const allowed = slotsForMealCount(target);
    const stale = a.plan?.meals.some((m) => m.status === "planned" && !allowed.includes(m.slot)) ?? false;
    if (target !== out.mealCount) {
      out.patch.mealsPerDay = target;
      out.mealsChanged = true;
      out.changes.push({
        kind: "meals_per_day",
        area: "meal",
        before: `${mealsLabel(out.mealCount)} (${slotNames(slotsForMealCount(out.mealCount))})`,
        after: `${mealsLabel(target)} (${slotNames(allowed)})`,
        summary: `Meals per day: ${target}`,
      });
      out.mealCount = target;
    } else if (stale) {
      // Preference already matches but today's plan still has extra slots: rebuild only.
      out.mealsChanged = true;
    } else {
      out.alreadyNotes.push(
        `You're already set to ${mealsLabel(target)} (${slotNames(allowed)}). Nothing to change.`,
      );
    }
  }
  return out;
};

/** Slots + kcal budgets a rebuild would produce for today (matches generatePlan's slot pick). */
const previewText = (plan: DayMealPlan | null, mealCount: number, targetKcal: number): string => {
  const allowed = slotsForMealCount(mealCount);
  const covered = new Set(plan?.meals.filter((m) => m.status === "logged").map((m) => m.slot) ?? []);
  const remaining = plan?.remaining ?? { kcal: targetKcal, proteinG: 0, carbsG: 0, fatG: 0 };
  const slots = pickSlotsToPlan(
    allowed.filter((s) => !covered.has(s)),
    remaining.kcal,
  );
  if (slots.length === 0) return "No open meals left today";
  const budgets = slotBudgets(remaining, slots);
  return slots.map((s) => `${SLOT_LABEL[s]} · new dish · ~${budgets[s]?.kcal ?? 0} kcal`).join("\n");
};

type RegenArgs = {
  body: CoachReviseBody;
  date: string;
  dryRun: boolean;
  wantsRegen: boolean;
  swapAllowed: boolean;
  mealCount: number;
  kcalTarget: number;
  existing: DayMealPlan | null;
};

const asWarning = (err: unknown): string =>
  err instanceof ApiError ? err.message : "Could not update meals right now";

/** Rebuild (or preview rebuilding) today's meals with real before/after text. Prefs must already be saved. */
export const runMealRegen = async (
  ctx: MealPlanCtx,
  a: RegenArgs,
): Promise<{ mealPlan: DayMealPlan | null; changes: CoachReviseChange[]; warnings: string[] }> => {
  const warnings: string[] = [];
  const changes: CoachReviseChange[] = [];
  if (!a.wantsRegen) return { mealPlan: a.existing, changes, warnings };
  const before = mealsText(a.existing);
  const label = a.date === todayUtc() ? "today's" : a.date;

  if (a.dryRun) {
    const item = a.swapAllowed
      ? a.existing?.meals.find((m) => m.id === a.body.context?.mealItemId)
      : undefined;
    if (item) {
      changes.push({
        kind: "meal_regen",
        area: "meal",
        before: `${SLOT_LABEL[item.slot]} · ${clip(item.title)} · ${item.kcal} kcal`,
        after: `${SLOT_LABEL[item.slot]} · new dish · ~${item.kcal} kcal`,
        summary: "Swap that meal",
      });
      return { mealPlan: a.existing, changes, warnings };
    }
    changes.push({
      kind: "meal_regen",
      area: "meal",
      before,
      after: previewText(a.existing, a.mealCount, a.kcalTarget),
      summary: `Rebuild ${label} meals`,
    });
    return { mealPlan: a.existing, changes, warnings };
  }

  try {
    const itemId = a.body.context?.mealItemId;
    const swapOne = a.swapAllowed && itemId && a.existing;
    const mealPlan = swapOne
      ? await swapPlannedMeal(ctx, a.existing!.id, { mealItemId: itemId })
      : await generatePlan(ctx, { date: a.date, force: true });
    changes.push({
      kind: "meal_regen",
      area: "meal",
      before,
      after: mealsText(mealPlan),
      summary: swapOne ? "Swapped that meal" : `Rebuilt ${label} meals`,
    });
    return { mealPlan, changes, warnings };
  } catch (err) {
    warnings.push(asWarning(err));
    return { mealPlan: await getTodayPlan(ctx, a.date).catch(() => null), changes, warnings };
  }
};
