import { getDb } from "./client";

const USER_TABLES = [
  "profiles",
  "preferences",
  "plans",
  "workout_sessions",
  "meals",
  "check_ins",
  "progress_photos",
  "weight_logs",
  "entitlements",
] as const;

/** Move rows owned by `from` to `to` (keeps existing `to` rows on key clashes). */
export const reassignLocalUser = async (
  from: string,
  to: string,
): Promise<void> => {
  if (from === to) return;
  const db = await getDb();
  for (const table of USER_TABLES) {
    await db.runAsync(
      `UPDATE OR IGNORE ${table} SET user_id = ? WHERE user_id = ?`,
      to,
      from,
    );
  }
};
