import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./auth";

/**
 * Plan-chat proposals (AMI-163, arch §8.3). Propose stores the fully drafted edit;
 * apply commits these rows with no AI call. One pending draft per user, 30 min TTL.
 */
export const reviseDrafts = sqliteTable(
  "revise_drafts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["pending", "applied", "expired"] }).notNull().default("pending"),
    /** Target day (YYYY-MM-DD). */
    date: text("date").notNull(),
    /** Resolved intent + reply/source/warnings echoed on apply. */
    intentJson: text("intent_json").notNull(),
    /** ReviseItem[] shown in the preview. */
    itemsJson: text("items_json").notNull(),
    prefsPatchJson: text("prefs_patch_json"),
    mealDraftJson: text("meal_draft_json"),
    workoutDraftJson: text("workout_draft_json"),
    /** Reserved for AMI-166 schedule moves. */
    scheduleDraftJson: text("schedule_draft_json"),
    /** Hash of the touched plan rows at propose time; apply 409s when it changed. */
    baseHash: text("base_hash").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    appliedAt: integer("applied_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("revise_drafts_user_status_idx").on(t.userId, t.status)],
);
