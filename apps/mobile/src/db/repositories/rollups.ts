import { getDb } from "../client";
import { getLocalUserId, nowMs } from "../ids";

/** Per-day cache of the server's nutrition + workout rollup (`nutrition_day_rollup`, migration 007). */
export type RollupDay = {
  readonly date: string;
  readonly kcalIn: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
  /** `null` when no target is known. */
  readonly kcalTarget: number | null;
  readonly workoutMinutes: number;
  readonly setsCompleted: number;
};

type RollupRow = {
  local_date: string;
  kcal_in: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  kcal_target: number | null;
  workout_minutes: number;
  sets_completed: number;
};

const mapRow = (r: RollupRow): RollupDay => ({
  date: r.local_date,
  kcalIn: r.kcal_in,
  proteinG: r.protein_g,
  carbsG: r.carbs_g,
  fatG: r.fat_g,
  kcalTarget: r.kcal_target,
  workoutMinutes: r.workout_minutes,
  setsCompleted: r.sets_completed,
});

/** Insert or replace every day in one transaction. */
export const upsertRollupDays = async (
  days: readonly RollupDay[],
  userId: string = getLocalUserId(),
): Promise<void> => {
  if (days.length === 0) return;
  const db = await getDb();
  const ts = nowMs();
  await db.withTransactionAsync(async () => {
    for (const d of days) {
      await db.runAsync(
        `INSERT OR REPLACE INTO nutrition_day_rollup (
          user_id, local_date, kcal_in, protein_g, carbs_g, fat_g,
          kcal_target, workout_minutes, sets_completed, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        userId,
        d.date,
        d.kcalIn,
        d.proteinG,
        d.carbsG,
        d.fatG,
        d.kcalTarget,
        d.workoutMinutes,
        d.setsCompleted,
        ts,
      );
    }
  });
};

/** Cached days inside `[from, to]`, oldest first (missing days are simply absent). */
export const listRollupDays = async (
  from: string,
  to: string,
  userId: string = getLocalUserId(),
): Promise<RollupDay[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync<RollupRow>(
    `SELECT local_date, kcal_in, protein_g, carbs_g, fat_g, kcal_target, workout_minutes, sets_completed
     FROM nutrition_day_rollup
     WHERE user_id = ? AND local_date >= ? AND local_date <= ?
     ORDER BY local_date ASC`,
    userId,
    from,
    to,
  );
  return rows.map(mapRow);
};
