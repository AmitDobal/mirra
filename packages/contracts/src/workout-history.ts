import { z } from "zod";

import { HistoryDateSchema, HistoryRangeSchema } from "./nutrition-history";

/** Workout history list + chart summary (AMI-131). */

const MAX_HISTORY_DAYS = 366;

export const WorkoutHistoryQuerySchema = z
  .object({
    from: HistoryDateSchema.optional(),
    to: HistoryDateSchema.optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: "from must be on or before to" })
  .refine(
    (q) =>
      !q.from || !q.to || (Date.parse(q.to) - Date.parse(q.from)) / 86_400_000 < MAX_HISTORY_DAYS,
    { message: `Range is limited to ${MAX_HISTORY_DAYS} days` },
  );

export const WorkoutHistorySessionSchema = z.object({
  id: z.string(),
  workoutId: z.string().nullable(),
  title: z.string().nullable(),
  startedAt: z.number().int(),
  endedAt: z.number().int().nullable(),
  rpe: z.number().int().nullable(),
  notes: z.string().nullable(),
  minutes: z.number().int(),
  setsCompleted: z.number().int(),
  volumeKg: z.number(),
});

export const WorkoutHistoryListResponseSchema = z.object({
  from: HistoryDateSchema,
  to: HistoryDateSchema,
  items: z.array(WorkoutHistorySessionSchema),
});

export const WorkoutSummaryDaySchema = z.object({
  date: HistoryDateSchema,
  sessions: z.number().int(),
  minutes: z.number().int(),
  setsCompleted: z.number().int(),
  volumeKg: z.number(),
});

export const WorkoutSummaryResponseSchema = z.object({
  range: HistoryRangeSchema,
  anchor: HistoryDateSchema,
  from: HistoryDateSchema,
  to: HistoryDateSchema,
  series: z.array(WorkoutSummaryDaySchema),
  totals: z.object({
    sessions: z.number().int(),
    minutes: z.number().int(),
    setsCompleted: z.number().int(),
    volumeKg: z.number(),
  }),
});

export type WorkoutHistoryQuery = z.infer<typeof WorkoutHistoryQuerySchema>;
export type WorkoutHistorySession = z.infer<typeof WorkoutHistorySessionSchema>;
export type WorkoutHistoryListResponse = z.infer<typeof WorkoutHistoryListResponseSchema>;
export type WorkoutSummaryDay = z.infer<typeof WorkoutSummaryDaySchema>;
export type WorkoutSummaryResponse = z.infer<typeof WorkoutSummaryResponseSchema>;
