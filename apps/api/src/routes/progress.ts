import {
  CreateProgressPhotoBodySchema,
  type ProgressPhoto,
  type ProgressPhotoListResponse,
} from "@mirra/contracts";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../db";
import { mediaObjects, progressPhotos } from "../db/schema";
import type { MirraEnv } from "../env";
import { badRequest, notFound } from "../lib/errors";
import { newId } from "../lib/id";
import { getObjectStore } from "../lib/object-store";
import { decodeCursor, olderThan, parsePageQuery, toPage } from "../lib/pagination";
import { type AuthVars, requireAuth } from "../middleware/auth";

const mediaPathFor = (photoId: string): string => `/v1/progress/photos/${photoId}/media`;

const r2KeyFor = (userId: string, mediaId: string): string =>
  `progress/${userId}/${mediaId}`;

const decodeBase64 = (raw: string): Uint8Array => {
  const cleaned = raw.includes(",") ? raw.slice(raw.indexOf(",") + 1) : raw;
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const toDto = (row: {
  id: string;
  pose: string;
  takenAt: Date | number;
  note: string | null;
  mediaId: string;
  r2Key: string;
  bytes: number | null;
}): ProgressPhoto => {
  const hasMedia = Boolean(row.bytes && row.bytes > 0 && !row.r2Key.startsWith("stub:"));
  return {
    id: row.id,
    pose: row.pose === "side" ? "side" : "front",
    takenAt: row.takenAt instanceof Date ? row.takenAt.getTime() : Number(row.takenAt),
    note: row.note,
    mediaId: row.mediaId,
    mediaPath: hasMedia ? mediaPathFor(row.id) : null,
    hasMedia,
  };
};

/**
 * Progress gallery — D1 metadata + R2 bytes via ObjectStore.
 * List / create / get + authenticated media stream for multi-device sync.
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
      bytes: mediaObjects.bytes,
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
  const body: ProgressPhotoListResponse = {
    nextCursor: page.nextCursor,
    items: page.items.map(toDto),
  };
  return c.json(body);
});

progressRoutes.post("/v1/progress/photos", requireAuth, async (c) => {
  const userId = c.get("userId");
  const raw = await c.req.json().catch(() => null);
  const parsed = CreateProgressPhotoBodySchema.safeParse(raw);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues.map((i) => i.message).join("; "));
  }

  const takenAt = new Date(parsed.data.takenAt ?? Date.now());
  const mediaId = newId();
  const photoId = newId();
  const contentType = parsed.data.contentType ?? "image/jpeg";
  const db = createDb(c.env.DB);
  const store = getObjectStore(c.env);

  let r2Key = `stub:${photoId}`;
  let bytes: number | null = null;

  if (parsed.data.imageBase64?.trim()) {
    let payload: Uint8Array;
    try {
      payload = decodeBase64(parsed.data.imageBase64.trim());
    } catch {
      throw badRequest("Invalid imageBase64");
    }
    if (payload.byteLength === 0) throw badRequest("Empty image");
    if (payload.byteLength > 6_000_000) throw badRequest("Image too large (max ~4.5MB)");
    r2Key = r2KeyFor(userId, mediaId);
    try {
      const put = await store.put({ r2Key, body: payload, contentType });
      bytes = put.bytes;
    } catch {
      throw badRequest("Object store unavailable");
    }
  }

  await db.insert(mediaObjects).values({
    id: mediaId,
    userId,
    kind: "progress",
    r2Key,
    contentType,
    bytes,
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
    toDto({
      id: photoId,
      pose: parsed.data.pose,
      takenAt,
      note: parsed.data.note ?? null,
      mediaId,
      r2Key,
      bytes,
    }),
    201,
  );
});

progressRoutes.get("/v1/progress/photos/:id", requireAuth, async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const db = createDb(c.env.DB);
  const [row] = await db
    .select({
      id: progressPhotos.id,
      pose: progressPhotos.pose,
      takenAt: progressPhotos.takenAt,
      note: progressPhotos.note,
      mediaId: progressPhotos.mediaId,
      r2Key: mediaObjects.r2Key,
      bytes: mediaObjects.bytes,
    })
    .from(progressPhotos)
    .innerJoin(mediaObjects, eq(progressPhotos.mediaId, mediaObjects.id))
    .where(and(eq(progressPhotos.userId, userId), eq(progressPhotos.id, id)))
    .limit(1);

  if (!row) throw notFound("Progress photo not found");
  return c.json(toDto(row));
});

progressRoutes.get("/v1/progress/photos/:id/media", requireAuth, async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const db = createDb(c.env.DB);
  const [row] = await db
    .select({
      r2Key: mediaObjects.r2Key,
      contentType: mediaObjects.contentType,
      bytes: mediaObjects.bytes,
    })
    .from(progressPhotos)
    .innerJoin(mediaObjects, eq(progressPhotos.mediaId, mediaObjects.id))
    .where(and(eq(progressPhotos.userId, userId), eq(progressPhotos.id, id)))
    .limit(1);

  if (!row || !row.bytes || row.r2Key.startsWith("stub:")) {
    throw notFound("Media not found");
  }

  const store = getObjectStore(c.env);
  const obj = await store.get(row.r2Key);
  if (!obj) throw notFound("Media object missing");

  return new Response(obj.body, {
    status: 200,
    headers: {
      "Content-Type": obj.contentType ?? row.contentType ?? "image/jpeg",
      "Cache-Control": "private, max-age=60",
      "Content-Length": String(obj.bytes),
    },
  });
});
