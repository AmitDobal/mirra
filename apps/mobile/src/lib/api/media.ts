import { apiFetch } from "./client";

export type MediaKind = "meal" | "mirror" | "progress";

type UploadSlot = {
  readonly mediaId: string;
  readonly uploadUrl: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly maxBytes: number;
};

/** Mirrors contracts `MEDIA_ALLOWED_TYPES`. */
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const;
type MediaType = (typeof ALLOWED)[number];

const toMediaType = (mime: string | null | undefined): MediaType => {
  const found = ALLOWED.find((t) => t === mime);
  return found ?? "image/jpeg";
};

/**
 * Worker-proxied R2 upload: `POST /v1/media/upload-url` → `PUT` bytes → `POST confirm`.
 * Resolves with the `mediaId` to attach to a meal / mirror / progress record.
 */
export const uploadMedia = async (
  kind: MediaKind,
  uri: string,
  mime?: string | null,
): Promise<string> => {
  const contentType = toMediaType(mime);
  const blob = await (await fetch(uri)).blob();
  const slot = await apiFetch<UploadSlot>("/v1/media/upload-url", {
    method: "POST",
    body: { kind, contentType },
  });
  if (blob.size > slot.maxBytes) throw new Error("Photo is too large to upload");
  await apiFetch(slot.uploadUrl, {
    method: "PUT",
    rawBody: blob,
    headers: { ...slot.headers },
  });
  await apiFetch(`/v1/media/${encodeURIComponent(slot.mediaId)}/confirm`, { method: "POST" });
  return slot.mediaId;
};

/** Meal photo → `mediaId` (kind `meal`). */
export const uploadMealPhoto = (uri: string, mime?: string | null) =>
  uploadMedia("meal", uri, mime);
