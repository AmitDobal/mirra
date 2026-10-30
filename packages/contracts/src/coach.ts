import { z } from "zod";

import { CheckInStatusSchema } from "./check-ins";

export const CoachAdviseBodySchema = z.object({
  readiness: z.number().min(0).max(10).optional(),
  status: CheckInStatusSchema,
  note: z.string().max(2000).optional(),
  vectorId: z.string().min(1).max(64).optional(),
  context: z.string().max(2000).optional(),
});

export const CoachVectorSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  recommended: z.boolean(),
});

export const CoachAdviseResponseSchema = z.object({
  message: z.string(),
  vectors: z.array(CoachVectorSchema).optional(),
  rebuildSuggested: z.boolean(),
});

export type CoachAdviseBody = z.infer<typeof CoachAdviseBodySchema>;
export type CoachVector = z.infer<typeof CoachVectorSchema>;
export type CoachAdviseResponse = z.infer<typeof CoachAdviseResponseSchema>;
