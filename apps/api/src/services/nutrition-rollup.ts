import { and, eq, gte, lt } from "drizzle-orm";

import type { AppDB } from "../db";
import { meals, nutritionDayRollup } from "../db/schema";
import { dayBoundsIn, localDateIn } from "../lib/dates";
import { userTz } from "./user-day";
import { defaultFuelTargets, loadCurrentPlan } from "./plan-loaders";
import { loadSessionStats } from "./workout-stats";

export type RollupRow = typeof nutritionDayRollup.$inferSelect;

/** Current plan kcal target (falls back to the app default). */
export const loadKcalTarget = async (db: AppDB, userId: string): Promise<number> => {
  const current = await loadCurrentPlan(db, userId);
  return defaultFuelTargets(current.plan?.summary ?? null).kcal;
};

/**
 * Recompute one `nutrition_day_rollup` row from meals + completed workouts and upsert it.
 * Called synchronously on meal / workout writes so charts stay cheap.
 */
export const rebuildDayRollup = async (
  db: AppDB,
  userId: string,
  date: string,
  kcalTarget?: number,
  tz?: string,
): Promise<RollupRow> => {
  // AMI-183: the day is the user's profile-timezone calendar day, not UTC.
  const zone = tz ?? (await userTz(db, userId));
  const { start, end } = dayBoundsIn(zone, date);
  const rows = await db
    .select({
      kcal: meals.kcal,
      proteinG: meals.proteinG,
      carbsG: meals.carbsG,
      fatG: meals.fatG,
    })
    .from(meals)
    .where(
      and(eq(meals.userId, userId), gte(meals.eatenAt, new Date(start)), lt(meals.eatenAt, new Date(end))),
    );
  const sums = rows.reduce(
    (a, m) => ({
      kcal: a.kcal + m.kcal,
      proteinG: a.proteinG + m.proteinG,
      carbsG: a.carbsG + m.carbsG,
      fatG: a.fatG + m.fatG,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
  const done = (await loadSessionStats(db, userId, start, end, zone)).filter((s) => s.endedAt != null);

  const row: RollupRow = {
    userId,
    localDate: date,
    kcalIn: sums.kcal,
    proteinG: Math.round(sums.proteinG * 10) / 10,
    carbsG: Math.round(sums.carbsG * 10) / 10,
    fatG: Math.round(sums.fatG * 10) / 10,
    kcalTarget: kcalTarget ?? (await loadKcalTarget(db, userId)),
    workoutMinutes: done.reduce((a, s) => a + s.minutes, 0),
    setsCompleted: done.reduce((a, s) => a + s.setsCompleted, 0),
    updatedAt: new Date(),
  };
  const { userId: _u, localDate: _d, ...set } = row;
  await db
    .insert(nutritionDayRollup)
    .values(row)
    .onConflictDoUpdate({ target: [nutritionDayRollup.userId, nutritionDayRollup.localDate], set });
  return row;
};

/** Rebuild several days; never fails the caller's write (logs and moves on). */
export const rebuildDaysSafe = async (
  db: AppDB,
  userId: string,
  dates: Array<string | Date>,
): Promise<void> => {
  try {
    const tz = await userTz(db, userId);
    const unique = [...new Set(dates.map((d) => (typeof d === "string" ? d : localDateIn(tz, d))))];
    const target = await loadKcalTarget(db, userId);
    for (const date of unique) await rebuildDayRollup(db, userId, date, target, tz);
  } catch (err) {
    console.warn("[nutrition-rollup] rebuild failed", err instanceof Error ? err.message : String(err));
  }
};
