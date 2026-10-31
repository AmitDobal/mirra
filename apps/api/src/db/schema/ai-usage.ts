import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const nowMs = sql`(unixepoch() * 1000)`;

/** One row per paid (or zero-cost metered) AI call. `estimated_micros` = USD micros. */
export const aiUsageEvents = sqliteTable(
  "ai_usage_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id"),
    /** revise | coach | meal_plan | meal_estimate | plan_gen | voice_tts */
    feature: text("feature").notNull(),
    provider: text("provider").notNull(),
    model: text("model"),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    totalTokens: integer("total_tokens"),
    estimatedMicros: integer("estimated_micros").notNull().default(0),
    metaJson: text("meta_json"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  },
  (t) => [
    index("ai_usage_events_user_created_idx").on(t.userId, t.createdAt),
    index("ai_usage_events_user_feature_created_idx").on(t.userId, t.feature, t.createdAt),
  ],
);

/** Rollup used for quota checks (cheap PK lookups, no event scans). */
export const aiUsageDaily = sqliteTable(
  "ai_usage_daily",
  {
    userId: text("user_id").notNull(),
    day: text("day").notNull(),
    feature: text("feature").notNull(),
    calls: integer("calls").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    estimatedMicros: integer("estimated_micros").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day, t.feature] })],
);

/** TTS cache: key = sha256(voiceId|text). Audio bytes live in R2 at `r2_key`. */
export const voiceCueCache = sqliteTable("voice_cue_cache", {
  cacheKey: text("cache_key").primaryKey(),
  r2Key: text("r2_key").notNull(),
  text: text("text").notNull(),
  voiceId: text("voice_id").notNull(),
  bytes: integer("bytes").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
});
