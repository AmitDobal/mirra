import { z } from "zod";

/** In-app alert kinds (no FCM in v1). `workout` / `nutrition` back the Workouts / Nutrition filters. */
export const NotificationKindSchema = z.enum([
  "streak_at_risk",
  "badge_unlock",
  "coach",
  "workout",
  "nutrition",
  "system",
]);

const HhMmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const NotificationSchema = z.object({
  id: z.string(),
  kind: NotificationKindSchema,
  title: z.string(),
  body: z.string(),
  /** Optional deep link, e.g. `{ "route": "/workout/live", "label": "Start Workout" }`. */
  payload: z
    .object({ route: z.string().optional(), label: z.string().optional(), chip: z.string().optional() })
    .nullable(),
  readAt: z.number().int().nullable(),
  createdAt: z.number().int(),
});

export const NotificationsQuerySchema = z.object({
  cursor: z.string().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const NotificationsResponseSchema = z.object({
  items: z.array(NotificationSchema),
  nextCursor: z.string().nullable(),
  /** Capped at 100; clients render `99+` above 99. */
  unreadCount: z.number().int().min(0).max(100),
});

/** `inAppEnabled: null` = never answered the soft ask. */
export const NotificationPrefsSchema = z.object({
  inAppEnabled: z.boolean().nullable(),
  streakReminders: z.boolean(),
  workoutReminders: z.boolean(),
  quietStart: HhMmSchema.nullable(),
  quietEnd: HhMmSchema.nullable(),
  softAskDismissedAt: z.number().int().nullable(),
});

export const NotificationPrefsPatchSchema = z
  .object({
    inAppEnabled: z.boolean(),
    streakReminders: z.boolean(),
    workoutReminders: z.boolean(),
    quietStart: HhMmSchema.nullable(),
    quietEnd: HhMmSchema.nullable(),
    /** "Not now": stop prompting on Today; keeps `inAppEnabled` null. */
    softAskDismissed: z.literal(true),
  })
  .partial()
  .strict();

export const NotificationReadAllResponseSchema = z.object({ updated: z.number().int() });

export type NotificationKind = z.infer<typeof NotificationKindSchema>;
export type NotificationItem = z.infer<typeof NotificationSchema>;
export type NotificationsResponse = z.infer<typeof NotificationsResponseSchema>;
export type NotificationPrefs = z.infer<typeof NotificationPrefsSchema>;
export type NotificationPrefsPatch = z.infer<typeof NotificationPrefsPatchSchema>;
