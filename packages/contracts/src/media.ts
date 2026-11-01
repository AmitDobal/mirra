import { z } from "zod";

/** Generic media upload (AMI-131). Worker-proxied R2 put: upload-url -> PUT bytes -> confirm. */

export const MediaKindSchema = z.enum(["meal", "mirror", "progress"]);

export const MEDIA_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const;
export const MEDIA_MAX_BYTES = 6_000_000;

export const MediaUploadUrlBodySchema = z.object({
  kind: MediaKindSchema,
  contentType: z.enum(MEDIA_ALLOWED_TYPES).default("image/jpeg"),
});

export const MediaUploadUrlResponseSchema = z.object({
  mediaId: z.string(),
  kind: MediaKindSchema,
  /** Relative to the API origin. PUT raw bytes here with `headers`. */
  uploadUrl: z.string(),
  method: z.literal("PUT"),
  headers: z.record(z.string()),
  maxBytes: z.number().int(),
  expiresAt: z.number().int(),
});

export const MediaConfirmResponseSchema = z.object({
  mediaId: z.string(),
  kind: MediaKindSchema,
  contentType: z.string(),
  bytes: z.number().int(),
  status: z.literal("ready"),
});

export type MediaKind = z.infer<typeof MediaKindSchema>;
export type MediaUploadUrlBody = z.infer<typeof MediaUploadUrlBodySchema>;
export type MediaUploadUrlResponse = z.infer<typeof MediaUploadUrlResponseSchema>;
export type MediaConfirmResponse = z.infer<typeof MediaConfirmResponseSchema>;
