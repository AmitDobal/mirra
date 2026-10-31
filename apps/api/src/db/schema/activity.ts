import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { users } from "./auth";
import { workouts } from "./plans";

const nowMs = sql`(unixepoch() * 1000)`;

export const workoutSessions = sqliteTable(
  "workout_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workoutId: text("workout_id").references(() => workouts.id, { onDelete: "set null" }),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    endedAt: integer("ended_at", { mode: "timestamp_ms" }),
    rpe: integer("rpe"),
    notes: text("notes"),
    totalsJson: text("totals_json"),
  },
  (t) => [index("workout_sessions_user_started_idx").on(t.userId, t.startedAt)],
);

export const setLogs = sqliteTable(
  "set_logs",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id"),
    exerciseName: text("exercise_name").notNull(),
    setIndex: integer("set_index").notNull(),
    weightKg: real("weight_kg"),
    reps: integer("reps"),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    loggedAt: integer("logged_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  },
  (t) => [index("set_logs_session_idx").on(t.sessionId)],
);

export const meals = sqliteTable(
  "meals",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eatenAt: integer("eaten_at", { mode: "timestamp_ms" }).notNull(),
    name: text("name").notNull(),
    mealSlot: text("meal_slot").notNull(),
    kcal: integer("kcal").notNull(),
    proteinG: real("protein_g").notNull().default(0),
    carbsG: real("carbs_g").notNull().default(0),
    fatG: real("fat_g").notNull().default(0),
    mediaId: text("media_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  },
  (t) => [index("meals_user_eaten_idx").on(t.userId, t.eatenAt)],
);

export const checkIns = sqliteTable(
  "check_ins",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    localDate: text("local_date").notNull(),
    status: text("status").notNull(),
    note: text("note"),
    triggeredRebuild: integer("triggered_rebuild", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  },
  (t) => [uniqueIndex("check_ins_user_date_uq").on(t.userId, t.localDate)],
);

export const waterLogs = sqliteTable(
  "water_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    localDate: text("local_date").notNull(),
    ml: integer("ml").notNull(),
    loggedAt: integer("logged_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  },
  (t) => [index("water_logs_user_date_idx").on(t.userId, t.localDate)],
);
