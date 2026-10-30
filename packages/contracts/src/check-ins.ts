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
