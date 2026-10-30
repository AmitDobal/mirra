import { z } from "zod";

import { getDb } from "../client";
import { dayBoundsMs, todayUtc } from "../dates";
import { LOCAL_USER_ID, newId, nowMs } from "../ids";
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
  const userId = data.userId ?? LOCAL_USER_ID;
  const db = await getDb();
  const ts = nowMs();
  const date = data.localDate ?? todayUtc();
  const eatenAt = data.eatenAt ?? Date.parse(`${date}T12:00:00.000Z`);
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

export const getFuelToday = async (
  userId: string = LOCAL_USER_ID,
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
