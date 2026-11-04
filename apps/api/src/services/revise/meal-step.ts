import type { Macros, MealSlot, MealSnap, PlannedMeal, ReviseItem } from "@mirra/contracts";

import { toCatalogRow } from "../../data/vetted-foods";
import { newId } from "../../lib/id";
import { filterCatalog } from "../../lib/meal-diet";
import { SLOT_ORDER, slotBudgets, subtractMacros, sumMacros } from "../../lib/meal-macros";
import { pickSlotsToPlan, slotsForMealCount } from "../../lib/meal-slots";
import type { PlanReviseIntent } from "../../ports/plan-reviser";
import type { Drafted, MealPlanCtx } from "../meal-plan-draft";
import type { MealPrefsPlan } from "../meal-revise";
import { draftMeals, toItemValues, type MealDraft, type MealOp } from "../meal-plan-targeted";
import { loadDayMeals } from "../meals";
import type { ReviseState } from "./context";
import { pickCandidate, targetMeals } from "./meal-targeting";
import { mealDelta, mealSnapReason, mealSwapReason, mealSwapTags } from "./tags";

export type MealStepResult = {
  items: ReviseItem[];
  draft: MealDraft | null;
  warnings: string[];
  /** Planned item ids the draft replaces (base hash input). */
  touchedIds: string[];
};

const SLOT_NAME: Record<MealSlot, string> = { breakfast: "breakfast", lunch: "lunch", snack: "snack", dinner: "dinner" };
/** Heuristic seeds tried per slot swap; the bias (e.g. more protein) picks among them. */
const CANDIDATE_SEEDS = 6;

const snapOf = (m: Pick<PlannedMeal, "title" | "kcal" | "proteinG" | "carbsG" | "fatG">): MealSnap => ({
  name: m.title,
  kcal: m.kcal,
  proteinG: m.proteinG,
  carbsG: m.carbsG,
  fatG: m.fatG,
});
const draftedSnap = (d: Drafted): MealSnap => ({ name: d.title, ...d.meal.totals });
const foodIdsOf = (m: PlannedMeal): string[] => m.items.map((i) => i.foodId);

const swapItem = (slot: MealSlot, before: MealSnap, after: MealSnap, budgetKcal: number): ReviseItem => {
  const delta = mealDelta(before, after);
  return {
    id: `meal:${slot}`,
    kind: "meal_swap",
    slot,
    before,
    after,
    delta,
    tags: mealSwapTags(delta, budgetKcal),
    reason: mealSwapReason(delta, after),
  };
};

type Args = {
  state: ReviseState;
  intent: PlanReviseIntent;
  prefs: MealPrefsPlan;
  mealItemId?: string;
};

/** Foods the post-revision prefs allow; null when no food pref changed. */
const catalogFor = (a: Args) => {
  const { dietTags, foodsAvoid, cuisines } = a.prefs.next;
  return filterCatalog(dietTags, foodsAvoid, cuisines, a.state.prefs?.lifestyleNotes);
};

const bannedFoodIds = (a: Args, allowed: ReadonlySet<string>): Set<string> | null => {
  if (!a.prefs.foodsChanged) return null;
  const before = filterCatalog(a.state.dietTags, a.state.foodsAvoid, a.state.cuisineStyles, a.state.prefs?.lifestyleNotes);
  return new Set(before.map((f) => f.id).filter((id) => !allowed.has(id)));
};

/** Swap only the targeted slots: heuristic candidates per slot, bias picks the winner. */
const draftSlots = async (ctx: MealPlanCtx, a: Args, targets: PlannedMeal[], catalog: ReturnType<typeof toCatalogRow>[]): Promise<MealStepResult> => {
  const day = a.state.mealPlan!;
  const out: MealStepResult = { items: [], draft: null, warnings: [], touchedIds: targets.map((t) => t.id) };
  const ops: MealOp[] = [];
  const used = new Set<string>();
  for (const target of targets) {
    const budget: Macros = { kcal: target.kcal, proteinG: target.proteinG, carbsG: target.carbsG, fatG: target.fatG };
    const scaled = a.intent.mealBias === "lighter" ? { ...budget, kcal: Math.round(budget.kcal * 0.8) } : budget;
    const candidates: Drafted[] = [];
    for (let i = 0; i < CANDIDATE_SEEDS; i++) {
      const { meals } = await draftMeals(ctx, {
        date: a.state.date,
        slots: [target.slot],
        budget: scaled,
        targets: day.targets,
        catalog,
        avoidFoodIds: foodIdsOf(target),
        seed: `${target.id}|revise|${i}`,
        useAi: false,
      });
      const d = meals.get(target.slot);
      if (d) candidates.push(d);
    }
    const pick = pickCandidate(candidates, a.intent.mealBias, target.title, used);
    if (!pick) {
      out.warnings.push(`No other ${SLOT_NAME[target.slot]} fits your food settings right now`);
      continue;
    }
    used.add(pick.title);
    ops.push({ op: "replace", itemId: target.id, slot: target.slot, values: toItemValues(pick) });
    out.items.push(swapItem(target.slot, snapOf(target), draftedSnap(pick), budget.kcal));
  }
  if (ops.length > 0) {
    out.draft = { date: a.state.date, dayId: day.id, createDay: null, source: "heuristic", wholeDay: false, ops };
  }
  return out;
};

/** Whole-day redraft of every open slot (meals per day, cuisine switch, "new meals"). */
const draftDay = async (ctx: MealPlanCtx, a: Args, catalog: ReturnType<typeof toCatalogRow>[]): Promise<MealStepResult> => {
  const { state } = a;
  const day = state.mealPlan;
  const out: MealStepResult = { items: [], draft: null, warnings: [], touchedIds: day?.meals.map((m) => m.id) ?? [] };
  if (!day && !state.plan.plan) {
    out.warnings.push("Finish your plan first, then I can build meals");
    return out;
  }
  const targets = day?.targets ?? state.targets;
  const dayMeals = await loadDayMeals(ctx.db, ctx.userId, state.date);
  const remaining = subtractMacros(targets, sumMacros(dayMeals));
  const meals = day?.meals ?? [];
  const covered = new Set<string>([
    ...meals.filter((m) => m.status === "logged").map((m) => m.slot),
    ...dayMeals.map((m) => m.mealSlot),
  ]);
  const open = slotsForMealCount(a.prefs.mealCount).filter((s) => !covered.has(s));
  const slots = pickSlotsToPlan(open, remaining.kcal);
  const { meals: drafted, source } = await draftMeals(ctx, {
    date: state.date,
    slots,
    budget: remaining,
    targets,
    catalog,
    avoidFoodIds: [],
    seed: `revise|${Date.now()}`,
    useAi: true,
  });
  const budgets = slotBudgets(remaining, slots);
  const ops: MealOp[] = [];
  for (const slot of SLOT_ORDER) {
    const current = meals.find((m) => m.slot === slot && m.status !== "logged");
    const next = slots.includes(slot) ? drafted.get(slot) : undefined;
    if (next) {
      const after = draftedSnap(next);
      if (current) ops.push({ op: "replace", itemId: current.id, slot, values: toItemValues(next) });
      else ops.push({ op: "insert", slot, values: toItemValues(next) });
      out.items.push(
        current && current.status === "planned"
          ? swapItem(slot, snapOf(current), after, budgets[slot]?.kcal ?? after.kcal)
          : { id: `meal:${slot}`, kind: "meal_add", slot, after, tags: ["New meal"], reason: mealSnapReason(after) },
      );
    } else if (current) {
      ops.push({ op: "delete", itemId: current.id, slot });
      if (current.status === "planned") {
        out.items.push({ id: `meal:${slot}`, kind: "meal_remove", slot, before: snapOf(current), tags: [], reason: mealSnapReason(snapOf(current)) });
      }
    }
  }
  if (slots.length === 0) out.warnings.push("No open meals left today");
  if (ops.length > 0) {
    out.draft = {
      date: state.date,
      dayId: day?.id ?? newId(),
      createDay: day ? null : { planId: state.plan.plan?.id ?? null, targetsJson: JSON.stringify(targets) },
      source,
      wholeDay: true,
      ops,
    };
  }
  return out;
};

/** Meal side of a proposal: target slots, draft real dishes in memory, build typed rows. */
export const mealStep = async (ctx: MealPlanCtx, a: Args): Promise<MealStepResult> => {
  const foods = catalogFor(a);
  const catalog = foods.map(toCatalogRow);
  const allowed = new Set(foods.map((f) => f.id));
  const plan = targetMeals({
    meals: a.state.mealPlan?.meals ?? [],
    mealItemId: a.mealItemId,
    mealSlots: a.intent.mealSlots,
    wholeDay: a.prefs.mealsChanged || (a.intent.forceMealRegen && a.intent.mealSlots.length === 0 && !a.mealItemId),
    banned: bannedFoodIds(a, allowed),
  });
  if (catalog.length === 0) return { items: [], draft: null, warnings: ["No foods match your diet settings"], touchedIds: [] };
  if (plan.wholeDay) {
    const out = await draftDay(ctx, a, catalog);
    return { ...out, warnings: [...plan.warnings, ...out.warnings] };
  }
  if (plan.targets.length === 0 || !a.state.mealPlan) {
    return { items: [], draft: null, warnings: plan.warnings, touchedIds: [] };
  }
  const out = await draftSlots(ctx, a, plan.targets, catalog);
  return { ...out, warnings: [...plan.warnings, ...out.warnings] };
};
