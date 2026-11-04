import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const nowMs = sql`(unixepoch() * 1000)`;

/**
 * Global cache of tagged exercise names (no user data). Keyed by `normalize(name)`.
 * `canonical_id` is a library id or `tag:<normalized_name>`.
 */
export const exerciseTags = sqliteTable("exercise_tags", {
  normalizedName: text("normalized_name").primaryKey(),
  canonicalId: text("canonical_id").notNull(),
  /** `[{ id, pct }]`, sums to 100. */
  musclesJson: text("muscles_json").notNull(),
  scoring: text("scoring").notNull(),
  pattern: text("pattern").notNull(),
  /** `ai` | `heuristic` */
  source: text("source").notNull(),
  model: text("model"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
});
