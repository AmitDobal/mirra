import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./auth";

const nowMs = sql`(unixepoch() * 1000)`;

export const plans = sqliteTable(
  "plans",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    status: text("status").notNull(),
    weekStart: text("week_start").notNull(),
    summaryJson: text("summary_json").notNull().default("{}"),
    source: text("source").notNull(),
    parentPlanId: text("parent_plan_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  },
  (t) => [index("plans_user_version_idx").on(t.userId, t.version)],
);

export const workouts = sqliteTable(
  "workouts",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    durationMin: integer("duration_min").notNull(),
    focus: text("focus"),
    calorieEst: integer("calorie_est"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("workouts_plan_idx").on(t.planId)],
);

export const planDays = sqliteTable(
  "plan_days",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    dayIndex: integer("day_index").notNull(),
    date: text("date").notNull(),
    kind: text("kind").notNull(),
    label: text("label"),
    workoutId: text("workout_id").references(() => workouts.id, { onDelete: "set null" }),
  },
  (t) => [index("plan_days_plan_day_idx").on(t.planId, t.dayIndex)],
);

export const workoutExercises = sqliteTable(
  "workout_exercises",
  {
    id: text("id").primaryKey(),
    workoutId: text("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    cue: text("cue"),
    targetSets: integer("target_sets").notNull(),
    targetReps: text("target_reps").notNull(),
    restSec: integer("rest_sec"),
    sortOrder: integer("sort_order").notNull().default(0),
    swapGroup: text("swap_group"),
  },
  (t) => [index("workout_exercises_workout_idx").on(t.workoutId)],
);

export const planJobs = sqliteTable(
  "plan_jobs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    status: text("status").notNull(),
    inputJson: text("input_json").notNull().default("{}"),
    error: text("error"),
    planId: text("plan_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("plan_jobs_user_idx").on(t.userId)],
);
