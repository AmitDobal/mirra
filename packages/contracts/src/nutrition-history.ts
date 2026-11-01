import { z } from "zod";

/** History charts (AMI-131): shared range query + nutrition summary. */

export const HistoryRangeSchema = z.enum(["day", "week", "month"]);
const isRealDate = (s: string): boolean => {
  const t = Date.parse(`${s}T00:00:00.000Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
};

export const HistoryDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine(isRealDate, "Not a real calendar date");

export const HistoryQuerySchema = z.object({
  range: HistoryRangeSchema.default("week"),
  /** Any date inside the window. Defaults to today (UTC). */
  anchor: HistoryDateSchema.optional(),
});

export const NutritionSummaryDaySchema = z.object({
  date: HistoryDateSchema,
  kcalIn: z.number().int(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  kcalTarget: z.number().int(),
  workoutMinutes: z.number().int(),
  setsCompleted: z.number().int(),
});

export const NutritionSummaryResponseSchema = z.object({
  range: HistoryRangeSchema,
  anchor: HistoryDateSchema,
  from: HistoryDateSchema,
  to: HistoryDateSchema,
  /** One entry per calendar day in the window (zero-filled). */
  series: z.array(NutritionSummaryDaySchema),
  totals: z.object({
    kcalIn: z.number().int(),
    proteinG: z.number(),
    carbsG: z.number(),
    fatG: z.number(),
    daysLogged: z.number().int(),
    avgKcalPerLoggedDay: z.number().int(),
    /** Logged days within 90-110% of the kcal target. */
    daysOnTarget: z.number().int(),
  }),
});

export type HistoryRange = z.infer<typeof HistoryRangeSchema>;
export type HistoryQuery = z.infer<typeof HistoryQuerySchema>;
export type NutritionSummaryDay = z.infer<typeof NutritionSummaryDaySchema>;
export type NutritionSummaryResponse = z.infer<typeof NutritionSummaryResponseSchema>;
