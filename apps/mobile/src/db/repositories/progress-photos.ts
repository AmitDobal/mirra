import { z } from "zod";

import { getDb } from "../client";
import { LOCAL_USER_ID, newId, nowMs } from "../ids";
import { PoseSchema, type LocalProgressPhoto } from "../types";

const SaveSchema = z.object({
  userId: z.string().optional(),
  localUri: z.string().min(1),
  pose: PoseSchema,
  takenAt: z.number().int().optional(),
  note: z.string().nullable().optional(),
});

export type SaveProgressPhotoInput = z.infer<typeof SaveSchema>;

export const saveProgressPhoto = async (
  input: SaveProgressPhotoInput,
): Promise<LocalProgressPhoto> => {
  const data = SaveSchema.parse(input);
  const userId = data.userId ?? LOCAL_USER_ID;
  const db = await getDb();
  const id = newId("photo");
  const takenAt = data.takenAt ?? nowMs();
  const createdAt = nowMs();

  await db.runAsync(
    `INSERT INTO progress_photos (id, user_id, local_uri, pose, taken_at, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    userId,
    data.localUri,
    data.pose,
    takenAt,
    data.note ?? null,
    createdAt,
  );

  return {
    id,
    localUri: data.localUri,
    pose: data.pose,
    takenAt,
    note: data.note ?? null,
  };
};

type Row = {
  id: string;
  local_uri: string;
  pose: string;
  taken_at: number;
  note: string | null;
};

const mapRow = (r: Row): LocalProgressPhoto => ({
  id: r.id,
  localUri: r.local_uri,
  pose: r.pose,
  takenAt: r.taken_at,
  note: r.note,
});

export const listProgressPhotos = async (
  userId: string = LOCAL_USER_ID,
  limit = 50,
): Promise<LocalProgressPhoto[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    `SELECT id, local_uri, pose, taken_at, note FROM progress_photos
     WHERE user_id = ? ORDER BY taken_at DESC LIMIT ?`,
    userId,
    limit,
  );
  return rows.map(mapRow);
};
