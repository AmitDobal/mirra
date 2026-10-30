import { z } from "zod";

import { CheckInStatusSchema } from "./check-ins";

/** UI readiness (Coach tab) or optional 0–10 scale. */
export const CoachReadinessSchema = z.union([
  z.enum(["push", "rest"]),
  z.number().min(0).max(10),
]);

export const CoachAdviseBodySchema = z.object({
  readiness: CoachReadinessSchema.optional(),
  status: CheckInStatusSchema.optional(),
  note: z.string().max(2000).optional(),
  vectorId: z.string().min(1).max(64).optional(),
  localDate: z.string().min(1).max(32).optional(),
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
  coachMessage: z.string().optional(),
});

export type CoachReadiness = z.infer<typeof CoachReadinessSchema>;
export type CoachAdviseBody = z.infer<typeof CoachAdviseBodySchema>;
export type CoachVector = z.infer<typeof CoachVectorSchema>;
export type CoachAdviseResponse = z.infer<typeof CoachAdviseResponseSchema>;
