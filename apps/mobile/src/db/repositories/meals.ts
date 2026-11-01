import { z } from "zod";

import { getDb } from "../client";
import { dayBoundsMs, todayUtc } from "../dates";
import { getLocalUserId, newId, nowMs } from "../ids";
import { MealSlotSchema, type FuelToday, type LocalMeal } from "../types";
import { getCurrentPlan } from "./plans";

const LogMealSchema = z.object({
  userId: z.string().optional(),
  name: z.string().min(1),
  mealSlot: MealSlotSchema.optional(),
  kcal: z.number().int().nonnegative().optional(),
  proteinG: z.number().nonnegative().optional(),
  carbsG: z.number().nonnegative().optional(),
  fatG: z.number().nonnegative().optional(),
  localDate: z.string().optional(),
  eatenAt: z.number().int().optional(),
});

export type LogMealInput = z.infer<typeof LogMealSchema>;

type MealRow = {
  id: string;
  name: string;
  meal_slot: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  eaten_at: number;
};

const mapMeal = (r: MealRow): LocalMeal => ({
  id: r.id,
  name: r.name,
  mealSlot: r.meal_slot,
  kcal: r.kcal,
  proteinG: r.protein_g,
  carbsG: r.carbs_g,
  fatG: r.fat_g,
  eatenAt: r.eaten_at,
});

export const logMeal = async (input: LogMealInput): Promise<LocalMeal> => {
  const data = LogMealSchema.parse(input);
  const userId = data.userId ?? getLocalUserId();
  const db = await getDb();
  const ts = nowMs();
  // UTC epoch ms; defaults to the moment of logging (never a fake noon).
  const eatenAt = data.eatenAt ?? ts;
  const id = newId("meal");

  await db.runAsync(
    `INSERT INTO meals (
      id, user_id, eaten_at, name, meal_slot, kcal, protein_g, carbs_g, fat_g, media_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    id,
    userId,
    eatenAt,
    data.name,
    data.mealSlot ?? "snack",
    data.kcal ?? 0,
    data.proteinG ?? 0,
    data.carbsG ?? 0,
    data.fatG ?? 0,
    ts,
  );

  return {
    id,
    name: data.name,
    mealSlot: data.mealSlot ?? "snack",
    kcal: data.kcal ?? 0,
    proteinG: data.proteinG ?? 0,
    carbsG: data.carbsG ?? 0,
    fatG: data.fatG ?? 0,
    eatenAt,
  };
};

export type LocalMealRef = {
  readonly id: string;
  /** Logged-at ms + name: local rows keep their own id, so match the API copy by these too. */
  readonly eatenAt?: number;
  readonly name?: string;
};

export type LocalMealPatch = {
  readonly name?: string;
  readonly mealSlot?: string;
  readonly kcal?: number;
  readonly proteinG?: number;
  readonly carbsG?: number;
  readonly fatG?: number;
  readonly eatenAt?: number;
};

const COLUMNS: Record<keyof LocalMealPatch, string> = {
  name: "name",
  mealSlot: "meal_slot",
  kcal: "kcal",
  proteinG: "protein_g",
  carbsG: "carbs_g",
  fatG: "fat_g",
  eatenAt: "eaten_at",
};

const matchClause = (ref: LocalMealRef) =>
  ref.eatenAt != null && ref.name != null
    ? { sql: "(id = ? OR (eaten_at = ? AND name = ?))", args: [ref.id, ref.eatenAt, ref.name] }
    : { sql: "id = ?", args: [ref.id] };

/** Best-effort local mirror of PATCH /v1/meals/:id. */
export const updateLocalMeal = async (
  ref: LocalMealRef,
  patch: LocalMealPatch,
  userId: string = getLocalUserId(),
): Promise<void> => {
  const entries = (Object.keys(COLUMNS) as (keyof LocalMealPatch)[])
    .filter((k) => patch[k] !== undefined)
    .map((k) => [COLUMNS[k], patch[k] as string | number] as const);
  if (entries.length === 0) return;
  const db = await getDb();
  const match = matchClause(ref);
  await db.runAsync(
    `UPDATE meals SET ${entries.map(([col]) => `${col} = ?`).join(", ")}
     WHERE user_id = ? AND ${match.sql}`,
    ...entries.map(([, v]) => v),
    userId,
    ...match.args,
  );
};

/** Best-effort local mirror of DELETE /v1/meals/:id. */
export const deleteLocalMeal = async (
  ref: LocalMealRef,
  userId: string = getLocalUserId(),
): Promise<void> => {
  const db = await getDb();
  const match = matchClause(ref);
  await db.runAsync(`DELETE FROM meals WHERE user_id = ? AND ${match.sql}`, userId, ...match.args);
};

export const getFuelToday = async (
  userId: string = getLocalUserId(),
  date: string = todayUtc(),
): Promise<FuelToday> => {
  const db = await getDb();
  const { start, end } = dayBoundsMs(date);
  const rows = await db.getAllAsync<MealRow>(
    `SELECT id, name, meal_slot, kcal, protein_g, carbs_g, fat_g, eaten_at
     FROM meals WHERE user_id = ? AND eaten_at >= ? AND eaten_at < ?
     ORDER BY eaten_at ASC`,
    userId,
    start,
    end,
  );
  const meals = rows.map(mapMeal);
  const plan = await getCurrentPlan(userId);
  const caloriesLogged = meals.reduce((sum, m) => sum + m.kcal, 0);
  const proteinLogged = meals.reduce((sum, m) => sum + m.proteinG, 0);

  return {
    date,
    caloriesTarget: plan?.summary.kcalTarget ?? null,
    proteinTarget: plan?.summary.proteinG ?? null,
    caloriesLogged,
    proteinLogged,
    meals,
  };
};
