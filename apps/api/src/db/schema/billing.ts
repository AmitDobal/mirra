import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./auth";

const nowMs = sql`(unixepoch() * 1000)`;

export const entitlements = sqliteTable("entitlements", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  productId: text("product_id"),
  rcAppUserId: text("rc_app_user_id"),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
});

/** Keep after user delete for audit / tax. */
export const paymentEvents = sqliteTable("payment_events", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  type: text("type").notNull(),
  payloadJson: text("payload_json").notNull().default("{}"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
});
