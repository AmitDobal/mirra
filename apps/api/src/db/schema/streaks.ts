import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./auth";

/**
 * Cached streak per user + kind (`check_in` | `workout`). Recomputed from `check_ins` on write;
 * never from `attendance_day`. `last_active_date` is the user's local-day anchor (YYYY-MM-DD).
 */
export const userStreaks = sqliteTable(
  "user_streaks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["check_in", "workout"] }).notNull(),
    currentCount: integer("current_count").notNull().default(0),
    bestCount: integer("best_count").notNull().default(0),
    lastActiveDate: text("last_active_date"),
    freezeRemaining: integer("freeze_remaining").notNull().default(0),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.kind] }),
    index("user_streaks_user_idx").on(t.userId),
  ],
);
