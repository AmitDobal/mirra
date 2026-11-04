import type { Macros, MealSlot, MealSnap, PlannedMeal, ReviseItem } from "@mirra/contracts";

import { toCatalogRow } from "../../data/vetted-foods";
import { newId } from "../../lib/id";
import { filterCatalog } from "../../lib/meal-diet";
import { SLOT_ORDER, slotBudgets, subtractMacros, sumMacros } from "../../lib/meal-macros";
import { pickSlotsToPlan, slotsForMealCount } from "../../lib/meal-slots";
import type { PlanReviseIntent, PlanReviseMealBias } from "../../ports/plan-reviser";
import type { Drafted, MealPlanCtx } from "../meal-plan-draft";
import type { MealPrefsPlan } from "../meal-revise";
import { draftMeals, toItemValues, type MealDraft, type MealOp } from "../meal-plan-targeted";
import { loadDayMeals } from "../meals";
import type { ReviseState } from "./context";
import { BIAS_LABEL, pickCandidate, targetMeals } from "./meal-targeting";
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

/**
 * Foods the new prefs newly ban, ingredient-level: allowed by the old diet/avoid rules and
 * not by the new ones. Cuisine is ignored on purpose: a dish built under older cuisine
 * picks still has to be swapped when it holds the banned food. Null = food prefs unchanged.
 */
const bannedFoodIds = (a: Args): Set<string> | null => {
  if (!a.prefs.foodsChanged) return null;
  const { dietTags, foodsAvoid } = a.prefs.next;
  const before = new Set(filterCatalog(a.state.dietTags, a.state.foodsAvoid, []).map((f) => f.id));
  const after = new Set(filterCatalog(dietTags, foodsAvoid, []).map((f) => f.id));
  return new Set([...before].filter((id) => !after.has(id)));
};

/** Budget tilted toward the bias, for a second round when no first-round dish beats the current one. */
const tilted = (b: Macros, bias: PlanReviseMealBias | undefined): Macros => {
  if (bias === "high_protein") return { ...b, proteinG: b.proteinG * 1.35, carbsG: Math.max(10, b.carbsG - b.proteinG * 0.35) };
  if (bias === "low_carb") return { ...b, carbsG: b.carbsG * 0.55, proteinG: b.proteinG * 1.15 };
  if (bias === "lighter") return { kcal: Math.round(b.kcal * 0.7), proteinG: b.proteinG * 0.85, carbsG: b.carbsG * 0.6, fatG: b.fatG * 0.6 };
  return b;
};

/** Swap only the targeted slots: heuristic candidates per slot, bias picks the winner. */
const draftSlots = async (ctx: MealPlanCtx, a: Args, targets: PlannedMeal[], catalog: ReturnType<typeof toCatalogRow>[]): Promise<MealStepResult> => {
  const day = a.state.mealPlan!;
  const out: MealStepResult = { items: [], draft: null, warnings: [], touchedIds: targets.map((t) => t.id) };
  const ops: MealOp[] = [];
  const used = new Set<string>();
  for (const target of targets) {
    const budget: Macros = { kcal: target.kcal, proteinG: target.proteinG, carbsG: target.carbsG, fatG: target.fatG };
    const bias = a.intent.mealBias;
    const current = { title: target.title, kcal: target.kcal, proteinG: target.proteinG, carbsG: target.carbsG };
    const round = async (b: Macros, tag: string): Promise<Drafted[]> => {
      const list: Drafted[] = [];
      for (let i = 0; i < CANDIDATE_SEEDS; i++) {
        const { meals } = await draftMeals(ctx, {
          date: a.state.date,
          slots: [target.slot],
          budget: b,
          targets: day.targets,
          catalog,
          avoidFoodIds: foodIdsOf(target),
          seed: `${target.id}|revise|${tag}${i}`,
          useAi: false,
        });
        const d = meals.get(target.slot);
        if (d) list.push(d);
      }
      return list;
    };
    const scaled = bias === "lighter" ? { ...budget, kcal: Math.round(budget.kcal * 0.8) } : budget;
    let pick = pickCandidate(await round(scaled, ""), bias, current, used);
    // The bias is a promise ("higher protein" means more protein): tilt the budget once more.
    if (!pick && bias) pick = pickCandidate(await round(tilted(budget, bias), "tilt"), bias, current, used);
    if (!pick) {
      out.warnings.push(
        bias
          ? `No ${BIAS_LABEL[bias]} ${SLOT_NAME[target.slot]} fits your targets and food settings, so ${SLOT_NAME[target.slot]} stays as is`
          : `No other ${SLOT_NAME[target.slot]} fits your food settings right now`,
      );
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

const human = (xs: readonly string[]): string => xs.map((x) => x.replace(/_/g, " ")).join(", ");

/** Meal side of a proposal: target slots, draft real dishes in memory, build typed rows. */
export const mealStep = async (ctx: MealPlanCtx, a: Args): Promise<MealStepResult> => {
  const foods = catalogFor(a);
  const catalog = foods.map(toCatalogRow);
  const { intent } = a;
  const noSlot = intent.mealSlots.length === 0 && !a.mealItemId;
  // "More protein in my meals": every planned slot, each held to the bias (no blind whole-day redraft).
  const biasAllDay = noSlot && intent.forceMealRegen && intent.mealBias != null && intent.cuisineStylesAdd.length === 0;
  const meals = a.state.mealPlan?.meals ?? [];
  const banned = bannedFoodIds(a);
  const plan = targetMeals({
    meals,
    mealItemId: a.mealItemId,
    mealSlots: biasAllDay ? meals.filter((m) => m.status === "planned").map((m) => m.slot) : intent.mealSlots,
    wholeDay: a.prefs.mealsChanged || (intent.forceMealRegen && noSlot && !biasAllDay),
    banned,
  });
  if (catalog.length === 0) return { items: [], draft: null, warnings: ["No foods match your diet settings"], touchedIds: [] };
  if (plan.wholeDay) {
    const out = await draftDay(ctx, a, catalog);
    return { ...out, warnings: [...plan.warnings, ...out.warnings] };
  }
  const warnings = [...plan.warnings];
  const holds = (m: PlannedMeal) => m.items.some((i) => banned?.has(i.foodId));
  if (banned && banned.size > 0 && !meals.some((m) => m.status === "planned" && holds(m))) {
    const what = human([...intent.foodsAvoidAdd, ...intent.dietTagsAdd]) || "that";
    warnings.push(`None of today's planned meals have ${what}, so no meal needs swapping`);
  }
  if (plan.targets.length === 0 || !a.state.mealPlan) {
    return { items: [], draft: null, warnings, touchedIds: [] };
  }
  const out = await draftSlots(ctx, a, plan.targets, catalog);
  return { ...out, warnings: [...warnings, ...out.warnings] };
};
