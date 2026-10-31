import type {
  DayMealPlan,
  Macros,
  MealSlot,
  PlannedItem,
  PlannedMeal,
} from "@mirra/contracts";
import { and, asc, eq, inArray } from "drizzle-orm";

import type { AppDB } from "../db";
import { mealPlanDays, mealPlanItems } from "../db/schema";
import { addDays, msToUnix } from "../lib/dates";
import { parseJson } from "../lib/json";
import { sumMacros, subtractMacros } from "../lib/meal-macros";
import { loadDayMeals } from "./meals";

export type DayRow = typeof mealPlanDays.$inferSelect;
export type ItemRow = typeof mealPlanItems.$inferSelect;

const ZERO: Macros = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

export const findDay = async (
  db: AppDB,
  userId: string,
  date: string,
): Promise<DayRow | null> => {
  const [row] = await db
    .select()
    .from(mealPlanDays)
    .where(and(eq(mealPlanDays.userId, userId), eq(mealPlanDays.localDate, date)))
    .limit(1);
  return row ?? null;
};

export const findDayById = async (
  db: AppDB,
  userId: string,
  dayId: string,
): Promise<DayRow | null> => {
  const [row] = await db
    .select()
    .from(mealPlanDays)
    .where(and(eq(mealPlanDays.id, dayId), eq(mealPlanDays.userId, userId)))
    .limit(1);
  return row ?? null;
};

export const loadItems = (db: AppDB, dayId: string): Promise<ItemRow[]> =>
  db
    .select()
    .from(mealPlanItems)
    .where(eq(mealPlanItems.dayId, dayId))
    .orderBy(asc(mealPlanItems.position));

export const toPlannedMeal = (r: ItemRow): PlannedMeal => ({
  id: r.id,
  slot: r.slot as MealSlot,
  title: r.title,
  items: parseJson<PlannedItem[]>(r.itemsJson, []),
  kcal: r.kcal,
  proteinG: r.proteinG,
  carbsG: r.carbsG,
  fatG: r.fatG,
  status: r.status as PlannedMeal["status"],
  loggedMealId: r.loggedMealId,
  fit: r.fit as PlannedMeal["fit"],
});

export const targetsOf = (day: DayRow): Macros => parseJson<Macros>(day.targetsJson, ZERO);

/** Day view: logged / remaining are recomputed live from `meals` (plan + off-plan). */
export const buildDayPlan = async (db: AppDB, day: DayRow): Promise<DayMealPlan> => {
  const rows = await loadItems(db, day.id);
  const meals = rows.map(toPlannedMeal);
  const targets = targetsOf(day);
  const logged = sumMacros(await loadDayMeals(db, day.userId, day.localDate));
  const planned = sumMacros(meals.filter((m) => m.status !== "skipped"));
  return {
    id: day.id,
    date: day.localDate,
    targets,
    planned,
    logged,
    remaining: subtractMacros(targets, logged),
    meals,
    source: day.source as DayMealPlan["source"],
    rebalancedAt: msToUnix(day.rebalancedAt),
  };
};

/** Food ids used in the 3 days before `date` (variety input). */
export const recentFoodIds = async (
  db: AppDB,
  userId: string,
  date: string,
): Promise<string[]> => {
  const dates = [1, 2, 3].map((n) => addDays(date, -n));
  const days = await db
    .select({ id: mealPlanDays.id })
    .from(mealPlanDays)
    .where(and(eq(mealPlanDays.userId, userId), inArray(mealPlanDays.localDate, dates)));
  if (days.length === 0) return [];
  const rows = await db
    .select({ itemsJson: mealPlanItems.itemsJson })
    .from(mealPlanItems)
    .where(
      inArray(
        mealPlanItems.dayId,
        days.map((d) => d.id),
      ),
    );
  const ids = new Set<string>();
  for (const r of rows) {
    for (const i of parseJson<PlannedItem[]>(r.itemsJson, [])) ids.add(i.foodId);
  }
  return [...ids];
};

export const foodIdsOf = (row: ItemRow): string[] =>
  parseJson<PlannedItem[]>(row.itemsJson, []).map((i) => i.foodId);
