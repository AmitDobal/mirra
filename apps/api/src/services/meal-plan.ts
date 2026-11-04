import type { DayMealPlan, GenerateMealPlanBody, MealSlot } from "@mirra/contracts";
import { eq, inArray } from "drizzle-orm";

import type { AppDB } from "../db";
import { mealPlanDays, mealPlanItems } from "../db/schema";
import { resolveAiProvider } from "../lib/ai/resolve-provider";
import { todayUtc } from "../lib/dates";
import { conflict } from "../lib/errors";
import { newId } from "../lib/id";
import { SLOT_ORDER, subtractMacros, sumMacros } from "../lib/meal-macros";
import { pickSlotsToPlan, slotsForMealCount } from "../lib/meal-slots";
import { withAiCredits } from "./credits-gate";
import {
  assertRateLimit,
  type Drafted,
  itemValues,
  loadCatalog,
  loadMealsPerDay,
  materializeDrafts,
  type MealPlanCtx,
  recordRegen,
} from "./meal-plan-draft";
import { loadDayMeals } from "./meals";
import {
  buildDayPlan,
  findDay,
  loadItems,
  recentFoodIds,
  type DayRow,
  type ItemRow,
} from "./meal-plan-store";
import { defaultFuelTargets, loadCurrentPlan } from "./plan-loaders";

export type { MealPlanCtx };

const view = async (db: AppDB, day: DayRow): Promise<DayMealPlan> => buildDayPlan(db, day);

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
  // Only slots in the user's meals-per-day preference are planned; the rest are not created.
  const allowedSlots = slotsForMealCount(await loadMealsPerDay(ctx));
  const openSlots = allowedSlots.filter((s) => !coveredSlots.has(s));
  const slots = pickSlotsToPlan(openSlots, remaining.kcal);
  const skippedSlots = openSlots.filter((s) => !slots.includes(s));

  const { meals, source } =
    slots.length > 0
      ? await withAiCredits(
          ctx,
          {
            feature: "meal_plan",
            paid: resolveAiProvider(ctx.env) === "openai",
            wasPaid: (r) => r.source === "openai",
          },
          async () =>
            materializeDrafts(
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
            ),
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

export { logPlannedMeal, rebalancePlan, swapPlannedMeal } from "./meal-plan-actions";
