import {
  MEDIA_MAX_BYTES,
  MediaUploadUrlBodySchema,
  type MediaConfirmResponse,
  type MediaKind,
  type MediaUploadUrlResponse,
} from "@mirra/contracts";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../db";
import { mediaObjects } from "../db/schema";
import type { MirraEnv } from "../env";
import { ApiError, badRequest, conflict, notFound } from "../lib/errors";
import { newId } from "../lib/id";
import { getObjectStore } from "../lib/object-store";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";

/**
 * Generic media upload for kinds meal | mirror | progress.
 * Flow: POST upload-url (reserves key + media_objects row) -> PUT bytes -> POST confirm.
 * Bytes are written to R2 through the `ObjectStore` port (Worker-proxied, no vendor SDK here).
 */
export const mediaRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

const UPLOAD_TTL_MS = 15 * 60_000;

const loadOwned = async (env: MirraEnv, userId: string, id: string) => {
  const db = createDb(env.DB);
  const [row] = await db
    .select()
    .from(mediaObjects)
    .where(and(eq(mediaObjects.id, id), eq(mediaObjects.userId, userId)))
    .limit(1);
  if (!row) throw notFound("Media not found");
  return { db, row };
};

mediaRoutes.post("/v1/media/upload-url", requireAuth, async (c) => {
  const body = parseBody(MediaUploadUrlBodySchema, await c.req.json().catch(() => ({})));
  const userId = c.get("userId");
  if (!c.env.MEDIA) {
    throw new ApiError("internal", "Media storage is not configured", 503);
  }
  const mediaId = newId();
  const slot = await getObjectStore(c.env).createUploadUrl({
    userId,
    mediaId,
    kind: body.kind,
    contentType: body.contentType,
    maxBytes: MEDIA_MAX_BYTES,
  });
  await createDb(c.env.DB).insert(mediaObjects).values({
    id: mediaId,
    userId,
    kind: body.kind,
    r2Key: slot.r2Key,
    contentType: body.contentType,
    bytes: null,
    createdAt: new Date(),
  });
  const response: MediaUploadUrlResponse = {
    mediaId,
    kind: body.kind,
    uploadUrl: `/v1/media/${mediaId}/content`,
    method: "PUT",
    headers: { "Content-Type": body.contentType },
    maxBytes: MEDIA_MAX_BYTES,
    expiresAt: Date.now() + UPLOAD_TTL_MS,
  };
  return c.json(response, 201);
});

mediaRoutes.put("/v1/media/:id/content", requireAuth, async (c) => {
  const { db, row } = await loadOwned(c.env, c.get("userId"), c.req.param("id"));
  if (row.bytes != null) throw conflict("Media already uploaded");
  if (Date.now() - row.createdAt.getTime() > UPLOAD_TTL_MS) throw badRequest("Upload URL expired");
  const sent = (c.req.header("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (sent !== row.contentType) throw badRequest(`Content-Type must be ${row.contentType}`);

  const payload = new Uint8Array(await c.req.arrayBuffer());
  if (payload.byteLength === 0) throw badRequest("Empty body");
  if (payload.byteLength > MEDIA_MAX_BYTES) throw badRequest("Image too large (max ~6MB)");

  const put = await getObjectStore(c.env).put({
    r2Key: row.r2Key,
    body: payload,
    contentType: row.contentType,
  });
  await db.update(mediaObjects).set({ bytes: put.bytes }).where(eq(mediaObjects.id, row.id));
  return c.json({ mediaId: row.id, bytes: put.bytes });
});

mediaRoutes.post("/v1/media/:id/confirm", requireAuth, async (c) => {
  const { db, row } = await loadOwned(c.env, c.get("userId"), c.req.param("id"));
  const head = await getObjectStore(c.env).head(row.r2Key);
  if (!head.exists || !head.bytes) throw conflict("Upload not found. PUT the bytes first.");
  await db.update(mediaObjects).set({ bytes: head.bytes }).where(eq(mediaObjects.id, row.id));
  const response: MediaConfirmResponse = {
    mediaId: row.id,
    kind: row.kind as MediaKind,
    contentType: row.contentType,
    bytes: head.bytes,
    status: "ready",
  };
  return c.json(response);
});

mediaRoutes.get("/v1/media/:id/content", requireAuth, async (c) => {
  const { row } = await loadOwned(c.env, c.get("userId"), c.req.param("id"));
  if (!row.bytes) throw notFound("Media not uploaded");
  const obj = await getObjectStore(c.env).get(row.r2Key);
  if (!obj) throw notFound("Media object missing");
  return new Response(obj.body, {
    status: 200,
    headers: {
      "Content-Type": obj.contentType ?? row.contentType,
      "Cache-Control": "private, max-age=60",
      "Content-Length": String(obj.bytes),
    },
  });
});
