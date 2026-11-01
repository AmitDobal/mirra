import { errorMessage, logger } from "@/lib/logger";

import { apiFetch, buildHeaders, buildUrl, MirraApiError } from "./client";

/** Mirrors `packages/contracts/src/media.ts` (mobile does not depend on contracts). */
export type MediaKind = "meal" | "mirror" | "progress";
const MEDIA_MAX_BYTES = 6_000_000;

type MediaUploadUrlResponse = {
  readonly mediaId: string;
  readonly uploadUrl: string;
  readonly method: "PUT";
  readonly headers: Record<string, string>;
};
type MediaConfirmResponse = { readonly mediaId: string; readonly status: "ready" };

type ImageContentType = "image/jpeg" | "image/png" | "image/webp" | "image/heic";

const contentTypeFromUri = (uri: string): ImageContentType => {
  const ext = uri.split("?")[0]?.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
};

/**
 * Media API flow (AMI-131): POST upload-url -> PUT raw bytes -> POST confirm.
 * Returns the confirmed `mediaId`. Throws on any failure; callers decide how to soft-fail.
 */
export const uploadMedia = async (
  kind: MediaKind,
  localUri: string,
): Promise<string> => {
  const blob = await (await fetch(localUri)).blob();
  if (blob.size === 0) throw new Error("Photo is empty");
  if (blob.size > MEDIA_MAX_BYTES) throw new Error("Photo is too large to upload");

  const slot = await apiFetch<MediaUploadUrlResponse>("/v1/media/upload-url", {
    method: "POST",
    body: { kind, contentType: contentTypeFromUri(localUri) },
  });

  const baseHeaders = await buildHeaders();
  const putRes = await fetch(buildUrl(slot.uploadUrl), {
    method: slot.method,
    headers: { ...baseHeaders, ...slot.headers, Accept: "application/json" },
    body: blob,
    credentials: "omit",
  });
  if (!putRes.ok) {
    logger.warn("media.put_failed", { kind, status: putRes.status });
    throw new MirraApiError("upload_failed", "Upload failed", putRes.status);
  }

  try {
    await apiFetch<MediaConfirmResponse>(`/v1/media/${slot.mediaId}/confirm`, {
      method: "POST",
      body: {},
    });
  } catch (err) {
    logger.warn("media.confirm_failed", { kind, message: errorMessage(err) });
    throw err;
  }
  return slot.mediaId;
};
