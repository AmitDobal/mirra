import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { createDb } from "../db";
import { mediaObjects, progressPhotos } from "../db/schema";
import type { MirraEnv } from "../env";
import { badRequest } from "../lib/errors";
import { newId } from "../lib/id";
import { decodeCursor, olderThan, parsePageQuery, toPage } from "../lib/pagination";
import { type AuthVars, requireAuth } from "../middleware/auth";

const PoseSchema = z.enum(["front", "side"]);

const CreateBodySchema = z.object({
  pose: PoseSchema.default("front"),
  note: z.string().max(2000).nullable().optional(),
  takenAt: z.number().int().positive().optional(),
  /** Local/device URI when R2 upload is not used yet. */
  localUri: z.string().max(2000).optional(),
});

/**
 * Progress photos — persists media stub + progress_photos row.
 * Full R2 upload lands later; day-test stores a stub media object so history survives.
 */
export const progressRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

progressRoutes.get("/v1/progress/photos", requireAuth, async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const { limit, cursor } = parsePageQuery(c.req.query());
  const rows = await db
    .select({
      id: progressPhotos.id,
      pose: progressPhotos.pose,
      takenAt: progressPhotos.takenAt,
      note: progressPhotos.note,
      mediaId: progressPhotos.mediaId,
      r2Key: mediaObjects.r2Key,
    })
    .from(progressPhotos)
    .innerJoin(mediaObjects, eq(progressPhotos.mediaId, mediaObjects.id))
    .where(
      and(
        eq(progressPhotos.userId, userId),
        cursor
          ? olderThan(progressPhotos.takenAt, progressPhotos.id, decodeCursor(cursor))
          : undefined,
      ),
    )
    .orderBy(desc(progressPhotos.takenAt), desc(progressPhotos.id))
    .limit(limit + 1);

  const tsOf = (r: (typeof rows)[number]): number =>
    r.takenAt instanceof Date ? r.takenAt.getTime() : Number(r.takenAt);
  const page = toPage(rows, limit, tsOf);

  return c.json({
    nextCursor: page.nextCursor,
    items: page.items.map((r) => ({
      id: r.id,
      pose: r.pose,
      takenAt: r.takenAt instanceof Date ? r.takenAt.getTime() : Number(r.takenAt),
      note: r.note,
      mediaId: r.mediaId,
      uri: r.r2Key.startsWith("local:") ? r.r2Key.slice("local:".length) : null,
    })),
  });
});

progressRoutes.post("/v1/progress/photos", requireAuth, async (c) => {
  const userId = c.get("userId");
  const raw = await c.req.json().catch(() => null);
  const parsed = CreateBodySchema.safeParse(raw);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues.map((i) => i.message).join("; "));
  }

  const takenAt = new Date(parsed.data.takenAt ?? Date.now());
  const mediaId = newId();
  const photoId = newId();
  const localUri = parsed.data.localUri?.trim() || `placeholder://${photoId}`;
  const db = createDb(c.env.DB);

  await db.insert(mediaObjects).values({
    id: mediaId,
    userId,
    kind: "progress_photo",
    r2Key: `local:${localUri}`,
    contentType: "image/jpeg",
    bytes: null,
    createdAt: new Date(),
  });

  await db.insert(progressPhotos).values({
    id: photoId,
    userId,
    mediaId,
    pose: parsed.data.pose,
    takenAt,
    note: parsed.data.note ?? null,
  });

  return c.json(
    {
      id: photoId,
      pose: parsed.data.pose,
      takenAt: takenAt.getTime(),
      note: parsed.data.note ?? null,
      mediaId,
      uri: localUri.startsWith("placeholder://") ? null : localUri,
    },
    201,
  );
});
