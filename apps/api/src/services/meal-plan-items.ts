import type {
  CreateMealPlanItemBody,
  DayMealPlan,
  MealPlanItemResponse,
  MealSlot,
  PatchMealPlanItemBody,
  PlannedItem,
} from "@mirra/contracts";
import { and, eq } from "drizzle-orm";

import type { AppDB } from "../db";
import { mealPlanDays, mealPlanItems } from "../db/schema";
import { conflict, notFound } from "../lib/errors";
import { newId } from "../lib/id";
import { parseJson } from "../lib/json";
import { SLOT_ORDER } from "../lib/meal-macros";
import {
  buildDayPlan,
  type DayRow,
  findDay,
  type ItemRow,
  loadItems,
  toPlannedMeal,
} from "./meal-plan-store";
import { defaultFuelTargets, loadCurrentPlan } from "./plan-loaders";

/** User-authored planned meals (no AI): create / edit / delete one planned-meal row. */

const customItem = (
  name: string,
  macros: Pick<PlannedItem, "kcal" | "proteinG" | "carbsG" | "fatG">,
  grams: number,
): PlannedItem => ({
  foodId: `custom:${newId()}`,
  name,
  grams,
  unitLabel: grams > 0 ? `${grams} g` : "1 serving",
  unitQty: 1,
  ...macros,
});

/** Day row for `localDate`, created on demand from the active plan's targets. */
const ensureDay = async (db: AppDB, userId: string, date: string): Promise<DayRow> => {
  const existing = await findDay(db, userId, date);
  if (existing) return existing;
  const current = await loadCurrentPlan(db, userId);
  if (!current.plan) throw conflict("No active plan. Finish onboarding first.");
  const day: DayRow = {
    id: newId(),
    userId,
    localDate: date,
    planId: current.plan.id,
    source: "heuristic",
    targetsJson: JSON.stringify(defaultFuelTargets(current.plan.summary)),
    rebalancedAt: null,
    createdAt: new Date(),
  };
  await db.insert(mealPlanDays).values(day);
  return day;
};

const loadOwnedItem = async (
  db: AppDB,
  userId: string,
  itemId: string,
): Promise<{ day: DayRow; item: ItemRow }> => {
  const [row] = await db
    .select({ item: mealPlanItems, day: mealPlanDays })
    .from(mealPlanItems)
    .innerJoin(mealPlanDays, eq(mealPlanItems.dayId, mealPlanDays.id))
    .where(and(eq(mealPlanItems.id, itemId), eq(mealPlanDays.userId, userId)))
    .limit(1);
  if (!row) throw notFound("Planned meal not found");
  return row;
};

const respond = async (db: AppDB, day: DayRow, itemId: string): Promise<MealPlanItemResponse> => {
  const rows = await loadItems(db, day.id);
  const item = rows.find((r) => r.id === itemId);
  if (!item) throw notFound("Planned meal not found");
  return { plan: await buildDayPlan(db, day), item: toPlannedMeal(item) };
};

export const createPlannedItem = async (
  db: AppDB,
  userId: string,
  body: CreateMealPlanItemBody,
): Promise<MealPlanItemResponse> => {
  const day = await ensureDay(db, userId, body.localDate);
  const macros = {
    kcal: body.kcal,
    proteinG: body.proteinG,
    carbsG: body.carbsG ?? 0,
    fatG: body.fatG ?? 0,
  };
  const values = {
    slot: body.slot,
    position: SLOT_ORDER.indexOf(body.slot),
    title: body.name,
    itemsJson: JSON.stringify([customItem(body.name, macros, body.grams ?? 0)]),
    ...macros,
    status: "planned",
    loggedMealId: null,
    fit: "ok",
    updatedAt: new Date(),
  };

  // Reuse the "Skipped" placeholder the generator leaves for a slot instead of stacking rows.
  const rows = await loadItems(db, day.id);
  const placeholder = rows.find((r) => r.slot === body.slot && r.status === "skipped");
  if (placeholder) {
    await db.update(mealPlanItems).set(values).where(eq(mealPlanItems.id, placeholder.id));
    return respond(db, day, placeholder.id);
  }
  const id = newId();
  await db.insert(mealPlanItems).values({ id, dayId: day.id, ...values });
  return respond(db, day, id);
};

export const updatePlannedItem = async (
  db: AppDB,
  userId: string,
  itemId: string,
  body: PatchMealPlanItemBody,
): Promise<MealPlanItemResponse> => {
  const { day, item } = await loadOwnedItem(db, userId, itemId);
  if (item.status !== "planned") throw conflict("Only planned meals can be edited");

  const set: Partial<typeof mealPlanItems.$inferInsert> = { updatedAt: new Date() };
  if (body.slot !== undefined) {
    set.slot = body.slot;
    set.position = SLOT_ORDER.indexOf(body.slot as MealSlot);
  }
  const title = body.name ?? item.title;
  const macrosChanged =
    body.kcal !== undefined ||
    body.proteinG !== undefined ||
    body.carbsG !== undefined ||
    body.fatG !== undefined ||
    body.grams !== undefined;
  const items = parseJson<PlannedItem[]>(item.itemsJson, []);

  if (body.name !== undefined) set.title = title;
  if (macrosChanged) {
    const macros = {
      kcal: body.kcal ?? item.kcal,
      proteinG: body.proteinG ?? item.proteinG,
      carbsG: body.carbsG ?? item.carbsG,
      fatG: body.fatG ?? item.fatG,
    };
    // Editing totals collapses the meal into one custom line so rows and items stay consistent.
    const grams = body.grams ?? (items.length === 1 ? items[0]!.grams : 0);
    Object.assign(set, macros, {
      fit: "ok",
      itemsJson: JSON.stringify([customItem(title, macros, grams)]),
    });
  } else if (body.name !== undefined && items.length === 1) {
    set.itemsJson = JSON.stringify([{ ...items[0]!, name: title }]);
  }

  await db.update(mealPlanItems).set(set).where(eq(mealPlanItems.id, item.id));
  return respond(db, day, item.id);
};

export const deletePlannedItem = async (
  db: AppDB,
  userId: string,
  itemId: string,
): Promise<DayMealPlan> => {
  const { day, item } = await loadOwnedItem(db, userId, itemId);
  if (item.status === "logged") {
    throw conflict("Delete the logged meal from Fuel instead");
  }
  await db.delete(mealPlanItems).where(eq(mealPlanItems.id, item.id));
  return buildDayPlan(db, day);
};
