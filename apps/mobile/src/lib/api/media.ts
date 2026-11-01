import { errorMessage, logger } from "@/lib/logger";

import { File, Paths } from "expo-file-system";

import { env } from "@/lib/config/env";

import { apiFetch, MirraApiError } from "./client";
import { mediaAuthHeaders } from "./progress";

/** Mirrors `packages/contracts/src/media.ts` (mobile does not depend on contracts). */
export type MediaKind = "meal" | "mirror" | "progress";

const MEDIA_MAX_BYTES = 6_000_000;

type MediaUploadUrlResponse = {
  readonly mediaId: string;
  readonly uploadUrl: string;
  readonly method: "PUT";
  readonly headers: Record<string, string>;
  readonly maxBytes: number;
};

type MediaConfirmResponse = { readonly mediaId: string; readonly status: "ready" };

/** Mirrors contracts `MEDIA_ALLOWED_TYPES`. */
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const;
type MediaType = (typeof ALLOWED)[number];

const toMediaType = (mime: string | null | undefined): MediaType => {
  const found = ALLOWED.find((t) => t === mime);
  return found ?? "image/jpeg";
};

const contentTypeFromUri = (uri: string): MediaType => {
  const ext = uri.split("?")[0]?.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
};

const resolveContentType = (uri: string, mime?: string | null): MediaType =>
  mime != null && mime !== "" ? toMediaType(mime) : contentTypeFromUri(uri);

/**
 * Media API flow: POST upload-url → PUT raw bytes → POST confirm.
 * Returns the confirmed `mediaId`. Throws on any failure; callers decide how to soft-fail.
 */
export const uploadMedia = async (
  kind: MediaKind,
  uri: string,
  mime?: string | null,
): Promise<string> => {
  const contentType = resolveContentType(uri, mime);
  const blob = await (await fetch(uri)).blob();
  if (blob.size === 0) throw new Error("Photo is empty");

  const slot = await apiFetch<MediaUploadUrlResponse>("/v1/media/upload-url", {
    method: "POST",
    body: { kind, contentType },
  });

  const maxBytes = slot.maxBytes ?? MEDIA_MAX_BYTES;
  if (blob.size > maxBytes) throw new Error("Photo is too large to upload");

  try {
    await apiFetch(slot.uploadUrl, {
      method: "PUT",
      rawBody: blob,
      headers: { ...slot.headers },
    });
  } catch (err) {
    logger.warn("media.put_failed", { kind, message: errorMessage(err) });
    if (err instanceof MirraApiError) throw err;
    throw new MirraApiError("upload_failed", "Upload failed", 0);
  }

  try {
    await apiFetch<MediaConfirmResponse>(
      `/v1/media/${encodeURIComponent(slot.mediaId)}/confirm`,
      { method: "POST", body: {} },
    );
  } catch (err) {
    logger.warn("media.confirm_failed", { kind, message: errorMessage(err) });
    throw err;
  }

  return slot.mediaId;
};

/** Meal photo → `mediaId` (kind `meal`). */
export const uploadMealPhoto = (uri: string, mime?: string | null) =>
  uploadMedia("meal", uri, mime);

/** Download an owned media object (`GET /v1/media/:id/content`) into cache; returns a file URI or null. */
export const cacheMediaContent = async (mediaId: string): Promise<string | null> => {
  const base = env.apiBaseUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/v1/media/${encodeURIComponent(mediaId)}/content`, {
    headers: await mediaAuthHeaders(),
  });
  if (!res.ok) return null;
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength === 0) return null;
  const file = new File(Paths.cache, `media-${mediaId}.jpg`);
  file.write(buf);
  return file.uri;
};
