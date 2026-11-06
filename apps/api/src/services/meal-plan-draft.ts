import type { MealSlot } from "@mirra/contracts";
import { and, count, eq, gte, inArray } from "drizzle-orm";

import { heuristicMealPlanGenerator } from "../adapters/heuristic-meal-plan-generator";
import { FOODS_BY_ID, toCatalogRow, type CatalogRow } from "../data/vetted-foods";
import type { AppDB } from "../db";
import { auditLog, preferences } from "../db/schema";
import type { MirraEnv } from "../env";
import { ApiError, conflict } from "../lib/errors";
import { newId } from "../lib/id";
import { parseJson } from "../lib/json";
import { foodBannedBy, type DietConstraints } from "../lib/diet-constraints";
import { guardMealDrafts } from "../lib/diet-guard";
import { dietCatalog } from "../lib/meal-diet";
import {
  materializeMeal,
  slotBudgets,
  sumMacros,
  type MaterializedMeal,
} from "../lib/meal-macros";
import { getMealPlanGenerator, getSwapMealPlanGenerator } from "../lib/meal-plan-generator";
import type { MealPlanDraftMeal, MealPlanInput } from "../ports/meal-plan-generator";
import { loadTimezone } from "./attendance";
import { goalContextFor } from "./goal-context";
import { goalPromptOf } from "./goal-copy";
import { userDayBounds, userToday } from "./user-day";

export type MealPlanCtx = { env: MirraEnv; db: AppDB; userId: string };

export const DAILY_MEAL_REGEN_LIMIT = 2;
const REGEN_ACTIONS = ["meal_plan.generate", "meal_plan.rebalance"] as const;
export const MEAL_REGEN_ACTIONS: readonly string[] = REGEN_ACTIONS;

export type Drafted = { title: string; meal: MaterializedMeal };

export const assertRateLimit = async (ctx: MealPlanCtx): Promise<void> => {
  // "For today" = the user's local day (AMI-183).
  const { start } = await userDayBounds(ctx.db, ctx.userId, await userToday(ctx.db, ctx.userId));
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
  if ((row?.n ?? 0) >= DAILY_MEAL_REGEN_LIMIT) {
    throw new ApiError("rate_limited", "Meal limit reached for today", 429);
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

/** Saved meals-per-day preference (null = default four slots). */
export const loadMealsPerDay = async (ctx: MealPlanCtx): Promise<number | null> => {
  const [row] = await ctx.db
    .select({ n: preferences.mealsPerDay })
    .from(preferences)
    .where(eq(preferences.userId, ctx.userId))
    .limit(1);
  return row?.n ?? null;
};

/** AMI-199: the user's resolved diet bans + allowed catalog (one prefs read). */
export const loadDietCatalog = async (
  ctx: Pick<MealPlanCtx, "db" | "userId">,
): Promise<{ catalog: CatalogRow[]; diet: DietConstraints }> => {
  const [prefs] = await ctx.db
    .select()
    .from(preferences)
    .where(eq(preferences.userId, ctx.userId))
    .limit(1);
  const { constraints, foods } = dietCatalog({
    dietTags: parseJson<string[]>(prefs?.dietTagsJson ?? "[]", []),
    foodsAvoid: prefs?.foodsAvoid,
    cuisineStyles: parseJson<string[]>(prefs?.cuisineJson ?? "[]", []),
    hintText: prefs?.lifestyleNotes,
    timezone: await loadTimezone(ctx.db, ctx.userId),
  });
  if (foods.length === 0) throw conflict("No foods match your diet settings");
  return { catalog: foods.map(toCatalogRow), diet: constraints };
};

export const loadCatalog = async (ctx: MealPlanCtx): Promise<CatalogRow[]> => (await loadDietCatalog(ctx)).catalog;

/**
 * Validate drafts (unknown ids rejected, grams clamped, macros computed server-side,
 * ±8% fit pass). Slots that fail validation are re-drafted by the heuristic.
 */
export const materializeDrafts = async (
  input: MealPlanInput,
  /** Pass ctx to use the configured generator (OpenAI/heuristic); omit for swap (heuristic only). */
  ctx?: MealPlanCtx,
): Promise<{ meals: Map<MealSlot, Drafted>; source: "openai" | "heuristic" }> => {
  // AMI-199: banned foods are never "allowed", even if a caller passed an unfiltered catalog.
  const allowed = new Set(
    input.catalog
      .filter((r) => {
        const f = FOODS_BY_ID.get(r.id);
        return f !== undefined && foodBannedBy(f, input.diet) === null;
      })
      .map((r) => r.id),
  );
  const budgets = slotBudgets(input.remaining, input.slots);
  const out = new Map<MealSlot, Drafted>();
  const accept = (drafts: MealPlanDraftMeal[], source: string) => {
    for (const d of guardMealDrafts(drafts, input.diet, `meal_plan.${source}`)) {
      const budget = budgets[d.slot];
      if (!budget || out.has(d.slot)) continue;
      const meal = materializeMeal(d.items, budget.kcal, allowed);
      if (meal) out.set(d.slot, { title: d.title.slice(0, 80), meal });
    }
  };

  const first = ctx
    ? await getMealPlanGenerator(ctx.env, ctx.db).generate({ ...input, goal: goalPromptOf(await goalContextFor(ctx)) })
    : await getSwapMealPlanGenerator().generate(input);
  accept(first.meals, first.source);
  let source = first.source;

  const missing = input.slots.filter((s) => !out.has(s));
  if (missing.length > 0) {
    const share = sumMacros(missing.map((s) => budgets[s]!));
    const fallback = await heuristicMealPlanGenerator.generate({
      ...input,
      remaining: share,
      slots: missing,
    });
    accept(fallback.meals, "heuristic_fallback");
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

