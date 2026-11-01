import { z } from "zod";

export const ProgressPoseSchema = z.enum(["front", "side"]);

export const CreateProgressPhotoBodySchema = z.object({
  pose: ProgressPoseSchema.default("front"),
  note: z.string().max(2000).nullable().optional(),
  /** Epoch ms; defaults to now. */
  takenAt: z.number().int().positive().optional(),
  /**
   * Optional JPEG/PNG bytes as base64 (no data-URL prefix).
   * When omitted, metadata-only stub is stored (no R2 object).
   */
  imageBase64: z.string().max(8_000_000).optional(),
  contentType: z
    .enum(["image/jpeg", "image/png", "image/webp"])
    .default("image/jpeg")
    .optional(),
});

export const ProgressPhotoSchema = z.object({
  id: z.string(),
  pose: ProgressPoseSchema,
  takenAt: z.number().int(),
  note: z.string().nullable(),
  mediaId: z.string(),
  /** Relative API path to authenticated media bytes, or null when stub-only. */
  mediaPath: z.string().nullable(),
  hasMedia: z.boolean(),
});

export const ProgressPhotoListResponseSchema = z.object({
  items: z.array(ProgressPhotoSchema),
  nextCursor: z.string().nullable(),
});

export type ProgressPose = z.infer<typeof ProgressPoseSchema>;
export type CreateProgressPhotoBody = z.infer<typeof CreateProgressPhotoBodySchema>;
export type ProgressPhoto = z.infer<typeof ProgressPhotoSchema>;
export type ProgressPhotoListResponse = z.infer<typeof ProgressPhotoListResponseSchema>;
