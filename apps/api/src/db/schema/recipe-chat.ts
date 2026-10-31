import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { users } from "./auth";
import { mealPlanItems } from "./meal-plans";

const nowMs = sql`(unixepoch() * 1000)`;

/** One Chef thread per (user, planned meal). Deleted with the meal (cascade). */
export const recipeChatThreads = sqliteTable(
  "recipe_chat_threads",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planItemId: text("plan_item_id")
      .notNull()
      .references(() => mealPlanItems.id, { onDelete: "cascade" }),
    /** open | capped */
    status: text("status").notNull().default("open"),
    turnCount: integer("turn_count").notNull().default(0),
    maxTurns: integer("max_turns").notNull().default(8),
    /** Cached AI recipe (validated). Key = contextHash + item updatedAt. */
    recipeJson: text("recipe_json"),
    recipeKey: text("recipe_key"),
    recipeSource: text("recipe_source"),
    contextHash: text("context_hash"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  },
  (t) => [uniqueIndex("recipe_chat_threads_user_item_uq").on(t.userId, t.planItemId)],
);

export const recipeChatTurns = sqliteTable(
  "recipe_chat_turns",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => recipeChatThreads.id, { onDelete: "cascade" }),
    idx: integer("idx").notNull(),
    role: text("role").notNull(),
    text: text("text").notNull(),
    clientRequestId: text("client_request_id"),
    source: text("source"),
    creditsCharged: integer("credits_charged").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  },
  (t) => [
    uniqueIndex("recipe_chat_turns_thread_idx_uq").on(t.threadId, t.idx),
    index("recipe_chat_turns_thread_req_idx").on(t.threadId, t.clientRequestId),
  ],
);
