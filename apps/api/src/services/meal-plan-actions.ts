import type {
  DayMealPlan,
  LogPlannedMealBody,
  Macros,
  MealResponse,
  MealSlot,
  RebalanceBody,
  SwapBody,
} from "@mirra/contracts";
import { eq, inArray } from "drizzle-orm";

import type { AppDB } from "../db";
import { mealPlanDays, mealPlanItems } from "../db/schema";
import { resolveAiProvider } from "../lib/ai/resolve-provider";
import { conflict, notFound } from "../lib/errors";
import { subtractMacros, sumMacros } from "../lib/meal-macros";
import { MIN_REPLAN_KCAL } from "../lib/meal-slots";
import { withAiCredits } from "./credits-gate";
import {
  assertRateLimit,
  itemValues,
  loadCatalog,
  materializeDrafts,
  type MealPlanCtx,
  recordRegen,
} from "./meal-plan-draft";
import { findMeal, insertMeal, loadDayMeals } from "./meals";
import {
  buildDayPlan,
  findDayById,
  foodIdsOf,
  loadItems,
  recentFoodIds,
  targetsOf,
  type DayRow,
  type ItemRow,
} from "./meal-plan-store";

/** Per-item meal plan actions (log / swap / rebalance), split out of meal-plan.ts (AMI-163). */

const skipItems = async (db: AppDB, rows: ItemRow[]): Promise<void> => {
  if (rows.length === 0) return;
  await db
    .update(mealPlanItems)
    .set({ status: "skipped", updatedAt: new Date() })
    .where(
      inArray(
        mealPlanItems.id,
        rows.map((r) => r.id),
      ),
    );
};

const view = async (db: AppDB, day: DayRow): Promise<DayMealPlan> => buildDayPlan(db, day);

const liveLogged = async (db: AppDB, day: DayRow): Promise<Macros> =>
  sumMacros(await loadDayMeals(db, day.userId, day.localDate));


const loadOwnedItem = async (ctx: MealPlanCtx, dayId: string, itemId: string) => {
  const day = await findDayById(ctx.db, ctx.userId, dayId);
  if (!day) throw notFound("Meal plan not found");
  const rows = await loadItems(ctx.db, day.id);
  const item = rows.find((r) => r.id === itemId);
  if (!item) throw notFound("Planned meal not found");
  return { day, item, rows };
};

export const logPlannedMeal = async (
  ctx: MealPlanCtx,
  dayId: string,
  body: LogPlannedMealBody,
): Promise<{ plan: DayMealPlan; meal: MealResponse; created: boolean }> => {
  const { day, item } = await loadOwnedItem(ctx, dayId, body.mealItemId);

  if (item.status === "logged" && item.loggedMealId) {
    const existing = await findMeal(ctx.db, ctx.userId, item.loggedMealId);
    if (existing) return { plan: await view(ctx.db, day), meal: existing, created: false };
  }
  if (item.status === "skipped") throw conflict("This meal was skipped");

  let meal = body.mealId ? await findMeal(ctx.db, ctx.userId, body.mealId) : null;
  const created = !meal;
  if (!meal) {
    try {
      meal = await insertMeal(
        ctx.db,
        ctx.userId,
        {
          name: item.title,
          mealSlot: item.slot as MealSlot,
          kcal: item.kcal,
          proteinG: item.proteinG,
          carbsG: item.carbsG,
          fatG: item.fatG,
          eatenAt: body.eatenAt,
        },
        body.mealId,
      );
    } catch (err) {
      if (body.mealId) throw conflict("mealId already in use");
      throw err;
    }
  }

  await ctx.db
    .update(mealPlanItems)
    .set({ status: "logged", loggedMealId: meal.id, updatedAt: new Date() })
    .where(eq(mealPlanItems.id, item.id));
  return { plan: await view(ctx.db, day), meal, created };
};

export const swapPlannedMeal = async (
  ctx: MealPlanCtx,
  dayId: string,
  body: SwapBody,
): Promise<DayMealPlan> => {
  const { day, item } = await loadOwnedItem(ctx, dayId, body.mealItemId);
  if (item.status !== "planned") throw conflict("Only planned meals can be swapped");

  const current = foodIdsOf(item);
  const slot = item.slot as MealSlot;
  const budget: Macros = {
    kcal: item.kcal,
    proteinG: item.proteinG,
    carbsG: item.carbsG,
    fatG: item.fatG,
  };
  // Swap stays heuristic-only (paid:false); wrap keeps ledger shape consistent.
  const catalog = await loadCatalog(ctx);
  const { meals } = await withAiCredits(
    ctx,
    { feature: "meal_plan", paid: false, wasPaid: () => false },
    () =>
      materializeDrafts({
        userId: ctx.userId,
        date: day.localDate,
        targets: targetsOf(day),
        remaining: budget,
        slots: [slot],
        catalog,
        avoidFoodIds: current,
        recentFoodIds: [],
        seed: `${item.id}|${current.join(",")}`,
      }),
  );
  const drafted = meals.get(slot);
  if (!drafted) throw conflict("No alternative found for this meal");

  await ctx.db.update(mealPlanItems).set(itemValues(drafted)).where(eq(mealPlanItems.id, item.id));
  return view(ctx.db, day);
};

export const rebalancePlan = async (
  ctx: MealPlanCtx,
  dayId: string,
  _body: RebalanceBody,
): Promise<DayMealPlan> => {
  const day = await findDayById(ctx.db, ctx.userId, dayId);
  if (!day) throw notFound("Meal plan not found");
  const rows = await loadItems(ctx.db, day.id);
  const planned = rows.filter((r) => r.status === "planned");
  if (planned.length === 0) return view(ctx.db, day);
  await assertRateLimit(ctx);

  const targets = targetsOf(day);
  const remaining = subtractMacros(targets, await liveLogged(ctx.db, day));
  const now = new Date();

  if (remaining.kcal < MIN_REPLAN_KCAL) {
    await skipItems(ctx.db, planned);
  } else {
    const loggedFoods = rows.filter((r) => r.status === "logged").flatMap(foodIdsOf);
    const catalog = await loadCatalog(ctx);
    const recent = [
      ...(await recentFoodIds(ctx.db, ctx.userId, day.localDate)),
      ...loggedFoods,
    ];
    const { meals, source } = await withAiCredits(
      ctx,
      {
        feature: "meal_plan",
        paid: resolveAiProvider(ctx.env) === "openai",
        wasPaid: (r) => r.source === "openai",
      },
      () =>
        materializeDrafts(
          {
            userId: ctx.userId,
            date: day.localDate,
            targets,
            remaining,
            slots: planned.map((r) => r.slot as MealSlot),
            catalog,
            avoidFoodIds: [],
            recentFoodIds: recent,
            seed: `rebalance|${now.getTime()}`,
          },
          ctx,
        ),
    );
    for (const row of planned) {
      const drafted = meals.get(row.slot as MealSlot);
      if (!drafted) continue;
      await ctx.db.update(mealPlanItems).set(itemValues(drafted)).where(eq(mealPlanItems.id, row.id));
    }
    await ctx.db.update(mealPlanDays).set({ source }).where(eq(mealPlanDays.id, day.id));
    day.source = source;
  }

  await ctx.db.update(mealPlanDays).set({ rebalancedAt: now }).where(eq(mealPlanDays.id, day.id));
  await recordRegen(ctx, "meal_plan.rebalance", day.localDate);
  return view(ctx.db, { ...day, rebalancedAt: now });
};
