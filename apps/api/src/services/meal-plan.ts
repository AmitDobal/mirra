import type {
  DayMealPlan,
  GenerateMealPlanBody,
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
import { todayUtc } from "../lib/dates";
import { conflict, notFound } from "../lib/errors";
import { newId } from "../lib/id";
import { SLOT_ORDER, subtractMacros, sumMacros } from "../lib/meal-macros";
import { MIN_REPLAN_KCAL, pickSlotsToPlan } from "../lib/meal-slots";
import {
  assertRateLimit,
  type Drafted,
  itemValues,
  loadCatalog,
  materializeDrafts,
  type MealPlanCtx,
  recordRegen,
} from "./meal-plan-draft";
import { findMeal, insertMeal, loadDayMeals } from "./meals";
import {
  buildDayPlan,
  findDay,
  findDayById,
  foodIdsOf,
  loadItems,
  recentFoodIds,
  targetsOf,
  type DayRow,
  type ItemRow,
} from "./meal-plan-store";
import { defaultFuelTargets, loadCurrentPlan } from "./plan-loaders";

export type { MealPlanCtx };

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

export const getTodayPlan = async (
  ctx: MealPlanCtx,
  date: string,
): Promise<DayMealPlan | null> => {
  const day = await findDay(ctx.db, ctx.userId, date);
  return day ? view(ctx.db, day) : null;
};

export const generatePlan = async (
  ctx: MealPlanCtx,
  body: GenerateMealPlanBody,
): Promise<DayMealPlan> => {
  const date = body.date ?? todayUtc();
  const current = await loadCurrentPlan(ctx.db, ctx.userId);
  if (!current.plan) throw conflict("No active plan. Finish onboarding first.");

  const existing = await findDay(ctx.db, ctx.userId, date);
  if (existing && !body.force) return view(ctx.db, existing);
  await assertRateLimit(ctx);

  const targets = defaultFuelTargets(current.plan.summary);
  const catalog = await loadCatalog(ctx);

  let day = existing;
  let kept: ItemRow[] = [];
  if (day) {
    const rows = await loadItems(ctx.db, day.id);
    kept = rows.filter((r) => r.status === "logged");
    const stale = rows.filter((r) => r.status !== "logged");
    if (stale.length > 0) {
      await ctx.db.delete(mealPlanItems).where(
        inArray(
          mealPlanItems.id,
          stale.map((r) => r.id),
        ),
      );
    }
  }

  // Same basis as fuel/today: every meal logged that day (plan or off-plan).
  const dayMeals = await loadDayMeals(ctx.db, ctx.userId, date);
  const remaining = subtractMacros(targets, sumMacros(dayMeals));
  const coveredSlots = new Set<string>([...kept.map((r) => r.slot), ...dayMeals.map((m) => m.mealSlot)]);
  const openSlots = SLOT_ORDER.filter((s) => !coveredSlots.has(s));
  const slots = pickSlotsToPlan(openSlots, remaining.kcal);
  const skippedSlots = openSlots.filter((s) => !slots.includes(s));

  const { meals, source } =
    slots.length > 0
      ? await materializeDrafts(
          {
            userId: ctx.userId,
            date,
            targets,
            remaining,
            slots: [...slots],
            catalog,
            avoidFoodIds: [],
            recentFoodIds: await recentFoodIds(ctx.db, ctx.userId, date),
            seed: body.force ? String(Date.now()) : undefined,
          },
          ctx,
        )
      : { meals: new Map<MealSlot, Drafted>(), source: "heuristic" as const };

  const values = { planId: current.plan.id, source, targetsJson: JSON.stringify(targets) };
  if (day) {
    await ctx.db.update(mealPlanDays).set({ ...values, rebalancedAt: null }).where(eq(mealPlanDays.id, day.id));
    day = { ...day, ...values, rebalancedAt: null };
  } else {
    day = {
      id: newId(),
      userId: ctx.userId,
      localDate: date,
      rebalancedAt: null,
      createdAt: new Date(),
      ...values,
    };
    await ctx.db.insert(mealPlanDays).values(day);
  }

  for (const slot of slots) {
    const drafted = meals.get(slot);
    if (!drafted) continue;
    await ctx.db.insert(mealPlanItems).values({
      id: newId(),
      dayId: day.id,
      slot,
      position: SLOT_ORDER.indexOf(slot),
      status: "planned",
      loggedMealId: null,
      ...itemValues(drafted),
    });
  }
  // Slots not worth planning (day nearly full) are surfaced as skipped, like rebalance.
  for (const slot of skippedSlots) {
    await ctx.db.insert(mealPlanItems).values({
      id: newId(),
      dayId: day.id,
      slot,
      position: SLOT_ORDER.indexOf(slot),
      title: "Skipped",
      itemsJson: "[]",
      kcal: 0,
      status: "skipped",
      loggedMealId: null,
    });
  }
  await recordRegen(ctx, "meal_plan.generate", date);
  return view(ctx.db, day);
};

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
  const { meals } = await materializeDrafts({
    userId: ctx.userId,
    date: day.localDate,
    targets: targetsOf(day),
    remaining: budget,
    slots: [slot],
    catalog: await loadCatalog(ctx),
    avoidFoodIds: current,
    recentFoodIds: [],
    seed: `${item.id}|${current.join(",")}`,
  });
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
    const { meals, source } = await materializeDrafts(
      {
        userId: ctx.userId,
        date: day.localDate,
        targets,
        remaining,
        slots: planned.map((r) => r.slot as MealSlot),
        catalog: await loadCatalog(ctx),
        avoidFoodIds: [],
        recentFoodIds: [...(await recentFoodIds(ctx.db, ctx.userId, day.localDate)), ...loggedFoods],
        seed: `rebalance|${now.getTime()}`,
      },
      ctx,
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
