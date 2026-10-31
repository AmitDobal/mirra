import { z } from "zod";

/** `none` has no row, `open` = opened the app only, `active` = logged a workout, meal or check-in. */
export const AttendanceStateSchema = z.enum(["none", "open", "active"]);

export const AttendanceDaySchema = z.object({
  /** `YYYY-MM-DD` in the user's profile timezone. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  state: AttendanceStateSchema,
  openedApp: z.boolean(),
  workoutDone: z.boolean(),
  mealLogged: z.boolean(),
  checkedIn: z.boolean(),
  opens: z.number().int(),
  firstSeenAt: z.number().int().nullable(),
  lastSeenAt: z.number().int().nullable(),
});

/** Seven consecutive days, oldest first. Future days are always `none`. */
export const AttendanceWeekResponseSchema = z.object({
  today: z.string(),
  start: z.string(),
  days: z.array(AttendanceDaySchema).length(7),
});

/** The client never sends a date: the server derives it from the profile timezone. */
export const AttendancePingBodySchema = z.object({
  source: z.literal("app_open"),
});

export const AttendanceWeekQuerySchema = z.object({
  start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const HistoryDayQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const HistoryDayResponseSchema = z.object({
  date: z.string(),
  presence: z.object({
    state: AttendanceStateSchema,
    firstSeenAt: z.number().int().nullable(),
  }),
  plannedWorkout: z.object({ title: z.string() }).nullable(),
  workout: z.object({
    sessions: z.number().int(),
    completedSets: z.number().int(),
    title: z.string().nullable(),
  }),
  meals: z.object({
    count: z.number().int(),
    kcal: z.number(),
    proteinG: z.number(),
  }),
  water: z.object({ loggedMl: z.number().int(), targetMl: z.number().int() }),
  checkIn: z
    .object({ status: z.string(), note: z.string().nullable() })
    .nullable(),
  weightKg: z.number().nullable(),
});

export type AttendanceState = z.infer<typeof AttendanceStateSchema>;
export type AttendanceDay = z.infer<typeof AttendanceDaySchema>;
export type AttendanceWeekResponse = z.infer<
  typeof AttendanceWeekResponseSchema
>;
export type AttendancePingBody = z.infer<typeof AttendancePingBodySchema>;
export type HistoryDayResponse = z.infer<typeof HistoryDayResponseSchema>;
