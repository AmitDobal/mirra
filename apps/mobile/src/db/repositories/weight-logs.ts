import { z } from "zod";

import { getDb } from "../client";
import { getLocalUserId, newId, nowMs } from "../ids";
import type { LocalWeightLog } from "../types";

const AddSchema = z.object({
  userId: z.string().optional(),
  id: z.string().min(1).optional(),
  kg: z.number().min(30).max(400),
  loggedAt: z.number().int().optional(),
});

export type AddWeightLogInput = z.infer<typeof AddSchema>;

type Row = { id: string; kg: number; logged_at: number };

const mapRow = (r: Row): LocalWeightLog => ({ id: r.id, kg: r.kg, loggedAt: r.logged_at });

/** Insert (or replace by id, used when syncing the server row over a local one). */
export const addWeightLog = async (input: AddWeightLogInput): Promise<LocalWeightLog> => {
  const data = AddSchema.parse(input);
  const userId = data.userId ?? getLocalUserId();
  const db = await getDb();
  const id = data.id ?? newId("wt");
  const loggedAt = data.loggedAt ?? nowMs();
  await db.runAsync(
    `INSERT OR REPLACE INTO weight_logs (id, user_id, kg, logged_at) VALUES (?, ?, ?, ?)`,
    id,
    userId,
    data.kg,
    loggedAt,
  );
  return { id, kg: data.kg, loggedAt };
};

export const removeWeightLog = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.runAsync("DELETE FROM weight_logs WHERE id = ?", id);
};

/** Keep the local profile in step with the server (`profiles.weightKg` = latest). */
export const setProfileWeight = async (
  kg: number,
  userId: string = getLocalUserId(),
): Promise<void> => {
  const db = await getDb();
  await db.runAsync(
    "UPDATE profiles SET weight_kg = ?, updated_at = ? WHERE user_id = ?",
    kg,
    nowMs(),
    userId,
  );
};

/** Newest-first. */
export const listWeightLogs = async (
  userId: string = getLocalUserId(),
  limit = 90,
): Promise<LocalWeightLog[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT id, kg, logged_at FROM weight_logs
     WHERE user_id = ? ORDER BY logged_at DESC, id DESC LIMIT ?`,
    userId,
    limit,
  );
  return rows.map(mapRow);
};

/** Replace the cached series with the authoritative server list. */
export const replaceWeightLogs = async (
  items: readonly LocalWeightLog[],
  userId: string = getLocalUserId(),
): Promise<void> => {
  const db = await getDb();
  await db.runAsync("DELETE FROM weight_logs WHERE user_id = ?", userId);
  for (const item of items) {
    await db.runAsync(
      `INSERT OR REPLACE INTO weight_logs (id, user_id, kg, logged_at) VALUES (?, ?, ?, ?)`,
      item.id,
      userId,
      item.kg,
      item.loggedAt,
    );
  }
};
