import { getDb } from "./client";

/** Child tables keyed through a parent row (no `user_id` column). */
const CHILD_DELETES = [
  `DELETE FROM set_logs WHERE session_id IN (SELECT id FROM workout_sessions WHERE user_id = ?)`,
  `DELETE FROM workout_exercises WHERE workout_id IN (
     SELECT w.id FROM workouts w JOIN plans p ON p.id = w.plan_id WHERE p.user_id = ?)`,
  `DELETE FROM workouts WHERE plan_id IN (SELECT id FROM plans WHERE user_id = ?)`,
  `DELETE FROM plan_days WHERE plan_id IN (SELECT id FROM plans WHERE user_id = ?)`,
] as const;

const USER_TABLES = [
  "workout_sessions",
  "plans",
  "meals",
  "meal_analysis_jobs",
  "nutrition_day_rollup",
  "check_ins",
  "progress_photos",
  "weight_logs",
  "preferences",
  "profiles",
  "entitlements",
] as const;

/** Delete every SQLite row owned by `userId` (children first, then user tables, then AI cache). */
export const wipeUserRows = async (userId: string): Promise<void> => {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const sql of CHILD_DELETES) await db.runAsync(sql, userId);
    for (const table of USER_TABLES) {
      await db.runAsync(`DELETE FROM ${table} WHERE user_id = ?`, userId);
    }
    // ai-cache keys are `${userId}:${key}`; `_` is a LIKE wildcard so match by prefix length.
    await db.runAsync(
      `DELETE FROM ai_response_cache WHERE substr(key, 1, ?) = ?`,
      userId.length + 1,
      `${userId}:`,
    );
  });
};
