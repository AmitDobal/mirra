import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./auth";

const nowMs = sql`(unixepoch() * 1000)`;

/** Per-day nutrition + training totals so history charts stay cheap. AMI-130. */
export const nutritionDayRollup = sqliteTable(
  "nutrition_day_rollup",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    localDate: text("local_date").notNull(),
    kcalIn: integer("kcal_in").notNull().default(0),
    proteinG: real("protein_g").notNull().default(0),
    carbsG: real("carbs_g").notNull().default(0),
    fatG: real("fat_g").notNull().default(0),
    kcalTarget: integer("kcal_target"),
    workoutMinutes: integer("workout_minutes").notNull().default(0),
    setsCompleted: integer("sets_completed").notNull().default(0),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.localDate] }),
    index("nutrition_day_rollup_user_date_idx").on(t.userId, t.localDate),
  ],
);

/** Async meal vision queue (same pattern as `plan_jobs`). status: queued | running | done | failed. */
export const mealAnalysisJobs = sqliteTable(
  "meal_analysis_jobs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mealId: text("meal_id"),
    mediaId: text("media_id"),
    status: text("status").notNull().default("queued"),
    inputJson: text("input_json").notNull().default("{}"),
    resultJson: text("result_json"),
    error: text("error"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("meal_analysis_jobs_user_idx").on(t.userId),
    index("meal_analysis_jobs_status_idx").on(t.status, t.createdAt),
  ],
);
