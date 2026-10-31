import { z } from "zod";

import { getDb } from "../client";
import { getLocalUserId, newId, nowMs } from "../ids";
import { CheckInStatusSchema, type LocalCheckIn } from "../types";

const SubmitSchema = z.object({
  userId: z.string().optional(),
  localDate: z.string().min(8),
  status: CheckInStatusSchema,
  note: z.string().nullable().optional(),
  triggeredRebuild: z.boolean().optional(),
});

export type SubmitCheckInInput = z.infer<typeof SubmitSchema>;

type Row = {
  id: string;
  local_date: string;
  status: string;
  note: string | null;
  triggered_rebuild: number;
  created_at: number;
};

const mapRow = (r: Row): LocalCheckIn => ({
  id: r.id,
  localDate: r.local_date,
  status: r.status,
  note: r.note,
  triggeredRebuild: r.triggered_rebuild === 1,
  createdAt: r.created_at,
});

export const submitCheckIn = async (
  input: SubmitCheckInInput,
): Promise<LocalCheckIn> => {
  const data = SubmitSchema.parse(input);
  const userId = data.userId ?? getLocalUserId();
  const db = await getDb();
  const ts = nowMs();
  const existing = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM check_ins WHERE user_id = ? AND local_date = ?",
    userId,
    data.localDate,
  );

  if (existing) {
    await db.runAsync(
      `UPDATE check_ins SET status = ?, note = ?, triggered_rebuild = ? WHERE id = ?`,
      data.status,
      data.note ?? null,
      data.triggeredRebuild ? 1 : 0,
      existing.id,
    );
    const row = await db.getFirstAsync<Row>(
      "SELECT * FROM check_ins WHERE id = ?",
      existing.id,
    );
    return mapRow(row!);
  }

  const id = newId("ci");
  await db.runAsync(
    `INSERT INTO check_ins (id, user_id, local_date, status, note, triggered_rebuild, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    userId,
    data.localDate,
    data.status,
    data.note ?? null,
    data.triggeredRebuild ? 1 : 0,
    ts,
  );

  return {
    id,
    localDate: data.localDate,
    status: data.status,
    note: data.note ?? null,
    triggeredRebuild: Boolean(data.triggeredRebuild),
    createdAt: ts,
  };
};

export const listCheckIns = async (
  userId: string = getLocalUserId(),
  limit = 30,
): Promise<LocalCheckIn[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM check_ins WHERE user_id = ?
     ORDER BY local_date DESC LIMIT ?`,
    userId,
    limit,
  );
  return rows.map(mapRow);
};
