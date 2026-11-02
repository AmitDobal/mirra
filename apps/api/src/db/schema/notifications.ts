import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./auth";

/**
 * Per-user in-app alert prefs. `in_app_enabled` NULL = soft ask never answered.
 * No `push_token` column in v1 (AMI-155 is in-app only; add FCM/APNs tokens in a later migration).
 */
export const notificationPrefs = sqliteTable("notification_prefs", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  inAppEnabled: integer("in_app_enabled", { mode: "boolean" }),
  streakReminders: integer("streak_reminders", { mode: "boolean" }).notNull().default(true),
  workoutReminders: integer("workout_reminders", { mode: "boolean" }).notNull().default(true),
  quietStart: text("quiet_start"),
  quietEnd: text("quiet_end"),
  softAskDismissedAt: integer("soft_ask_dismissed_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    payloadJson: text("payload_json"),
    readAt: integer("read_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("notifications_user_created_idx").on(t.userId, t.createdAt),
    index("notifications_user_read_idx").on(t.userId, t.readAt),
  ],
);
