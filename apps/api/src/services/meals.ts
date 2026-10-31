import type { MealBody, MealPatchBody, MealResponse, MealSlot } from "@mirra/contracts";
import { and, eq, gte, lt } from "drizzle-orm";

import type { AppDB } from "../db";
import { mealPlanItems, meals } from "../db/schema";
import { dayBoundsMs, msToUnix } from "../lib/dates";
import { notFound } from "../lib/errors";
import { newId } from "../lib/id";

export const toMealResponse = (m: typeof meals.$inferSelect): MealResponse => ({
  id: m.id,
  name: m.name,
  mealSlot: m.mealSlot as MealSlot,
  kcal: m.kcal,
  proteinG: m.proteinG,
  carbsG: m.carbsG,
  fatG: m.fatG,
  eatenAt: msToUnix(m.eatenAt) ?? 0,
  mediaId: m.mediaId,
  createdAt: msToUnix(m.createdAt) ?? 0,
});

export type MealInput = Omit<MealBody, "proteinG" | "carbsG" | "fatG"> &
  Partial<Pick<MealBody, "proteinG" | "carbsG" | "fatG">>;

/**
 * Single insert path for `meals` — shared by `POST /v1/meals` and
 * `POST /v1/meal-plan/:id/log`. Optional `id` is a client UUID (idempotency).
 */
export const insertMeal = async (
  db: AppDB,
  userId: string,
  body: MealInput,
  id: string = newId(),
): Promise<MealResponse> => {
  const now = new Date();
  const eatenAt = body.eatenAt != null ? new Date(body.eatenAt) : now;
  const row: typeof meals.$inferInsert = {
    id,
    userId,
    eatenAt,
    name: body.name,
    mealSlot: body.mealSlot,
    kcal: body.kcal,
    proteinG: body.proteinG ?? 0,
    carbsG: body.carbsG ?? 0,
    fatG: body.fatG ?? 0,
    mediaId: body.mediaId ?? null,
    createdAt: now,
  };
  await db.insert(meals).values(row);
  return toMealResponse({ ...row, createdAt: now } as typeof meals.$inferSelect);
};

export const findMeal = async (
  db: AppDB,
  userId: string,
  mealId: string,
): Promise<MealResponse | null> => {
  const [row] = await db
    .select()
    .from(meals)
    .where(and(eq(meals.id, mealId), eq(meals.userId, userId)))
    .limit(1);
  return row ? toMealResponse(row) : null;
};

/** All meals eaten on a UTC calendar day. */
export const loadDayMeals = async (
  db: AppDB,
  userId: string,
  date: string,
): Promise<MealResponse[]> => {
  const { start, end } = dayBoundsMs(date);
  const rows = await db
    .select()
    .from(meals)
    .where(
      and(
        eq(meals.userId, userId),
        gte(meals.eatenAt, new Date(start)),
        lt(meals.eatenAt, new Date(end)),
      ),
    );
  return rows.map(toMealResponse);
};

/** Partial edit of one of the user's meals. 404 when missing or owned by someone else. */
export const updateMeal = async (
  db: AppDB,
  userId: string,
  mealId: string,
  patch: MealPatchBody,
): Promise<MealResponse> => {
  const set: Partial<typeof meals.$inferInsert> = {};
  if (patch.name !== undefined) set.name = patch.name;
  const slot = patch.mealSlot ?? patch.slot;
  if (slot !== undefined) set.mealSlot = slot;
  if (patch.kcal !== undefined) set.kcal = patch.kcal;
  if (patch.proteinG !== undefined) set.proteinG = patch.proteinG;
  if (patch.carbsG !== undefined) set.carbsG = patch.carbsG;
  if (patch.fatG !== undefined) set.fatG = patch.fatG;
  if (patch.eatenAt !== undefined) set.eatenAt = new Date(patch.eatenAt);

  const [row] = await db
    .update(meals)
    .set(set)
    .where(and(eq(meals.id, mealId), eq(meals.userId, userId)))
    .returning();
  if (!row) throw notFound("Meal not found");
  return toMealResponse(row);
};

/**
 * Delete one of the user's meals. A planned meal that was logged as this meal
 * returns to "planned" so the day plan stays consistent.
 */
export const deleteMeal = async (db: AppDB, userId: string, mealId: string): Promise<void> => {
  const deleted = await db
    .delete(meals)
    .where(and(eq(meals.id, mealId), eq(meals.userId, userId)))
    .returning({ id: meals.id });
  if (deleted.length === 0) throw notFound("Meal not found");
  await db
    .update(mealPlanItems)
    .set({ status: "planned", loggedMealId: null, updatedAt: new Date() })
    .where(eq(mealPlanItems.loggedMealId, mealId));
};
