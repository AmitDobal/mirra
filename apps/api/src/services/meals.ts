import type {
  MealAnalysisStatus,
  MealBody,
  MealIngredient,
  MealPatchBody,
  MealResponse,
  MealSlot,
} from "@mirra/contracts";
import { and, eq, gte, lt } from "drizzle-orm";

import type { AppDB } from "../db";
import { mealPlanItems, meals } from "../db/schema";
import { dayBoundsMs, msToUnix } from "../lib/dates";
import { parseJsonColumn } from "../lib/json";
import { notFound } from "../lib/errors";
import { newId } from "../lib/id";
import { recordAttendanceSafe } from "./attendance";
import { rebuildDaysSafe } from "./nutrition-rollup";

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
  fiberG: m.fiberG,
  sugarG: m.sugarG,
  sodiumMg: m.sodiumMg,
  ingredients: parseJsonColumn<MealIngredient[]>(m.ingredientsJson, []),
  warnings: parseJsonColumn<string[]>(m.warningsJson, []),
  analysisStatus: (m.analysisStatus as MealAnalysisStatus) ?? "none",
  analysisSource: (m.analysisSource as MealResponse["analysisSource"]) ?? null,
  estimateConfidence: m.estimateConfidence,
});

const jsonOrNull = (v: unknown[] | undefined): string | null =>
  v && v.length > 0 ? JSON.stringify(v) : null;

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
    fiberG: body.fiberG ?? null,
    sugarG: body.sugarG ?? null,
    sodiumMg: body.sodiumMg ?? null,
    ingredientsJson: jsonOrNull(body.ingredients),
    warningsJson: jsonOrNull(body.warnings),
    analysisStatus: body.analysisStatus ?? "none",
    analysisSource: body.analysisSource ?? null,
    estimateConfidence: body.estimateConfidence ?? null,
    createdAt: now,
  };
  await db.insert(meals).values(row);
  await recordAttendanceSafe(db, userId, "mealLogged");
  await rebuildDaysSafe(db, userId, [eatenAt]);
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
  if (patch.fiberG !== undefined) set.fiberG = patch.fiberG;
  if (patch.sugarG !== undefined) set.sugarG = patch.sugarG;
  if (patch.sodiumMg !== undefined) set.sodiumMg = patch.sodiumMg;
  if (patch.ingredients !== undefined) set.ingredientsJson = jsonOrNull(patch.ingredients);
  if (patch.warnings !== undefined) set.warningsJson = jsonOrNull(patch.warnings);
  if (patch.analysisStatus !== undefined) set.analysisStatus = patch.analysisStatus;
  if (patch.analysisSource !== undefined) set.analysisSource = patch.analysisSource;
  if (patch.estimateConfidence !== undefined) set.estimateConfidence = patch.estimateConfidence;

  const [before] = await db
    .select({ eatenAt: meals.eatenAt })
    .from(meals)
    .where(and(eq(meals.id, mealId), eq(meals.userId, userId)))
    .limit(1);
  const [row] = await db
    .update(meals)
    .set(set)
    .where(and(eq(meals.id, mealId), eq(meals.userId, userId)))
    .returning();
  if (!row) throw notFound("Meal not found");
  await rebuildDaysSafe(db, userId, before ? [before.eatenAt, row.eatenAt] : [row.eatenAt]);
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
    .returning({ id: meals.id, eatenAt: meals.eatenAt });
  if (deleted.length === 0) throw notFound("Meal not found");
  await rebuildDaysSafe(db, userId, [deleted[0].eatenAt]);
  await db
    .update(mealPlanItems)
    .set({ status: "planned", loggedMealId: null, updatedAt: new Date() })
    .where(eq(mealPlanItems.loggedMealId, mealId));
};
