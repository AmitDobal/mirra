import type { MealSlot } from "@mirra/contracts";
import { and, count, eq, gte, inArray } from "drizzle-orm";

import { heuristicMealPlanGenerator } from "../adapters/heuristic-meal-plan-generator";
import { toCatalogRow } from "../data/vetted-foods";
import type { AppDB } from "../db";
import { auditLog, preferences } from "../db/schema";
import type { MirraEnv } from "../env";
import { dayBoundsMs, todayUtc } from "../lib/dates";
import { ApiError, conflict } from "../lib/errors";
import { newId } from "../lib/id";
import { parseJson } from "../lib/json";
import { filterCatalog } from "../lib/meal-diet";
import {
  materializeMeal,
  slotBudgets,
  sumMacros,
  type MaterializedMeal,
} from "../lib/meal-macros";
import { getMealPlanGenerator, getSwapMealPlanGenerator } from "../lib/meal-plan-generator";
import type { MealPlanInput } from "../ports/meal-plan-generator";

export type MealPlanCtx = { env: MirraEnv; db: AppDB; userId: string };

const DAILY_REGEN_LIMIT = 10;
const REGEN_ACTIONS = ["meal_plan.generate", "meal_plan.rebalance"];

export type Drafted = { title: string; meal: MaterializedMeal };

export const assertRateLimit = async (ctx: MealPlanCtx): Promise<void> => {
  const { start } = dayBoundsMs(todayUtc());
  const [row] = await ctx.db
    .select({ n: count() })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.userId, ctx.userId),
        inArray(auditLog.action, REGEN_ACTIONS),
        gte(auditLog.createdAt, new Date(start)),
      ),
    );
  if ((row?.n ?? 0) >= DAILY_REGEN_LIMIT) {
    throw new ApiError("rate_limited", "Meal plan limit reached for today", 429);
  }
};

export const recordRegen = (ctx: MealPlanCtx, action: string, date: string) =>
  ctx.db.insert(auditLog).values({
    id: newId(),
    userId: ctx.userId,
    action,
    metaJson: JSON.stringify({ date }),
    createdAt: new Date(),
  });

export const loadCatalog = async (ctx: MealPlanCtx) => {
  const [prefs] = await ctx.db
    .select()
    .from(preferences)
    .where(eq(preferences.userId, ctx.userId))
    .limit(1);
  const foods = filterCatalog(
    parseJson<string[]>(prefs?.dietTagsJson ?? "[]", []),
    prefs?.foodsAvoid,
    parseJson<string[]>(prefs?.cuisineJson ?? "[]", []),
    prefs?.lifestyleNotes,
  );
  if (foods.length === 0) throw conflict("No foods match your diet settings");
  return foods.map(toCatalogRow);
};

/**
 * Validate drafts (unknown ids rejected, grams clamped, macros computed server-side,
 * ±8% fit pass). Slots that fail validation are re-drafted by the heuristic.
 */
export const materializeDrafts = async (
  input: MealPlanInput,
  /** Pass ctx to use the configured generator (OpenAI/heuristic); omit for swap (heuristic only). */
  ctx?: MealPlanCtx,
): Promise<{ meals: Map<MealSlot, Drafted>; source: "openai" | "heuristic" }> => {
  const allowed = new Set(input.catalog.map((r) => r.id));
  const budgets = slotBudgets(input.remaining, input.slots);
  const out = new Map<MealSlot, Drafted>();
  const accept = (drafts: { slot: MealSlot; title: string; items: { foodId: string; grams: number }[] }[]) => {
    for (const d of drafts) {
      const budget = budgets[d.slot];
      if (!budget || out.has(d.slot)) continue;
      const meal = materializeMeal(d.items, budget.kcal, allowed);
      if (meal) out.set(d.slot, { title: d.title.slice(0, 80), meal });
    }
  };

  const first = ctx
    ? await getMealPlanGenerator(ctx.env, ctx.db).generate(input)
    : await getSwapMealPlanGenerator().generate(input);
  accept(first.meals);
  let source = first.source;

  const missing = input.slots.filter((s) => !out.has(s));
  if (missing.length > 0) {
    const share = sumMacros(missing.map((s) => budgets[s]!));
    const fallback = await heuristicMealPlanGenerator.generate({
      ...input,
      remaining: share,
      slots: missing,
    });
    accept(fallback.meals);
    source = "heuristic";
  }
  return { meals: out, source };
};

export const itemValues = (d: Drafted) => ({
  title: d.title,
  itemsJson: JSON.stringify(d.meal.items),
  kcal: d.meal.totals.kcal,
  proteinG: d.meal.totals.proteinG,
  carbsG: d.meal.totals.carbsG,
  fatG: d.meal.totals.fatG,
  fit: d.meal.fit,
  updatedAt: new Date(),
});

