import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./auth";

const nowMs = sql`(unixepoch() * 1000)`;

export const mediaObjects = sqliteTable(
  "media_objects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    r2Key: text("r2_key").notNull(),
    contentType: text("content_type").notNull(),
    bytes: integer("bytes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  },
  (t) => [index("media_objects_user_idx").on(t.userId)],
);

export const progressPhotos = sqliteTable(
  "progress_photos",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaId: text("media_id")
      .notNull()
      .references(() => mediaObjects.id, { onDelete: "cascade" }),
    pose: text("pose").notNull(),
    takenAt: integer("taken_at", { mode: "timestamp_ms" }).notNull(),
    note: text("note"),
  },
  (t) => [index("progress_photos_user_taken_idx").on(t.userId, t.takenAt)],
);

export const weightLogs = sqliteTable(
  "weight_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kg: real("kg").notNull(),
    loggedAt: integer("logged_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("weight_logs_user_logged_idx").on(t.userId, t.loggedAt)],
);
