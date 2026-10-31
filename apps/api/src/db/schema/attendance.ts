import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./auth";

/** One row per user per local day. Derived cache for Today week-strip dots, not a streak source. */
export const attendanceDay = sqliteTable(
  "attendance_day",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    localDate: text("local_date").notNull(),
    openedApp: integer("opened_app", { mode: "boolean" }).notNull().default(false),
    workoutDone: integer("workout_done", { mode: "boolean" }).notNull().default(false),
    mealLogged: integer("meal_logged", { mode: "boolean" }).notNull().default(false),
    checkedIn: integer("checked_in", { mode: "boolean" }).notNull().default(false),
    opens: integer("opens").notNull().default(0),
    firstSeenAt: integer("first_seen_at", { mode: "timestamp_ms" }).notNull(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.localDate] }),
    index("attendance_day_user_date_idx").on(t.userId, t.localDate),
  ],
);
