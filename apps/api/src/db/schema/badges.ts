import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./auth";

export const badgeDefinitions = sqliteTable("badge_definitions", {
  id: text("id").primaryKey(),
  ladder: text("ladder", { enum: ["kinetic_rank", "streak_milestone"] }).notNull(),
  tier: integer("tier").notNull(),
  title: text("title").notNull(),
  ruleJson: text("rule_json").notNull(),
  stitchAssetKey: text("stitch_asset_key"),
});

export const userBadges = sqliteTable(
  "user_badges",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeId: text("badge_id")
      .notNull()
      .references(() => badgeDefinitions.id, { onDelete: "cascade" }),
    unlockedAt: integer("unlocked_at", { mode: "timestamp_ms" }).notNull(),
    metaJson: text("meta_json"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeId] })],
);
