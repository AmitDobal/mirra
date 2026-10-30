import { z } from "zod";

import { PlanDayKindSchema, PlanSummarySchema, PlanWorkoutSchema } from "./plans";

export const TodayQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const TodayWeekDaySchema = z.object({
  date: z.string(),
  dayIndex: z.number().int(),
  kind: PlanDayKindSchema,
  label: z.string().nullable(),
  isToday: z.boolean(),
});

export const TodayFuelSchema = z.object({
  kcalTarget: z.number().int(),
  kcalLogged: z.number().int(),
  kcalRemaining: z.number().int(),
  proteinGTarget: z.number(),
  proteinGLogged: z.number(),
});

export const TodayResponseSchema = z.object({
  date: z.string(),
  workout: PlanWorkoutSchema.nullable(),
  day: z
    .object({
      id: z.string(),
      kind: PlanDayKindSchema,
      label: z.string().nullable(),
    })
    .nullable(),
  fuel: TodayFuelSchema,
  weekStrip: z.array(TodayWeekDaySchema),
  checkInDue: z.boolean(),
  summary: PlanSummarySchema.nullable(),
});

export type TodayResponse = z.infer<typeof TodayResponseSchema>;
