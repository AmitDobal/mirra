import { z } from "zod";

export const CheckInStatusSchema = z.enum([
  "done",
  "partial",
  "skipped",
  "soreness",
  "low_sleep",
  "travel",
]);

export const CheckInBodySchema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: CheckInStatusSchema,
  note: z.string().max(2000).nullable().optional(),
});

export const CheckInResponseSchema = z.object({
  id: z.string(),
  localDate: z.string(),
  status: CheckInStatusSchema,
  note: z.string().nullable(),
  triggeredRebuild: z.boolean(),
  createdAt: z.number().int(),
  /** Present when OpenAI coach advise runs after check-in. */
  coachMessage: z.string().optional(),
});

export type CheckInBody = z.infer<typeof CheckInBodySchema>;
export type CheckInResponse = z.infer<typeof CheckInResponseSchema>;
export type CheckInStatus = z.infer<typeof CheckInStatusSchema>;

/** Shared cursor-pagination query for history lists (progress photos, check-ins, meals). */
export const PageQuerySchema = z.object({
  /** Default 20; values above 50 are clamped to 50. */
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .default(20)
    .transform((n) => Math.min(n, 50)),
  /** Opaque cursor returned as `nextCursor` by the previous page. */
  cursor: z.string().max(200).optional(),
});

export const CheckInListResponseSchema = z.object({
  items: z.array(CheckInResponseSchema.omit({ coachMessage: true })),
  nextCursor: z.string().nullable(),
});

export type PageQuery = z.infer<typeof PageQuerySchema>;
export type CheckInListResponse = z.infer<typeof CheckInListResponseSchema>;
