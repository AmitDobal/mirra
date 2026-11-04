import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./auth";

/** Per-lift sustained score (arch §5, §6.2). Only lifts with a standard get a row. */
export const exerciseScores = sqliteTable(
  "exercise_scores",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Exercise library id. */
    exerciseId: text("exercise_id").notNull(),
    sustainedPct: real("sustained_pct").notNull(),
    bestPct: real("best_pct").notNull(),
    lastSessionPct: real("last_session_pct").notNull(),
    bestE1rmKg: real("best_e1rm_kg"),
    /** Set behind `best_pct` (weight = added kg for bodyweight lifts; reps = seconds for time lifts). */
    bestWeightKg: real("best_weight_kg"),
    bestReps: integer("best_reps"),
    sessions: integer("sessions").notNull(),
    displayStep: integer("display_step").notNull(),
    belowCount: integer("below_count").notNull().default(0),
    standardsVersion: text("standards_version").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.exerciseId] })],
);

/** All 18 muscles, rewritten on every recompute. Unranked muscles have no row. */
export const muscleScores = sqliteTable(
  "muscle_scores",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    muscleId: text("muscle_id").notNull(),
    pct: real("pct").notNull(),
    displayStep: integer("display_step").notNull(),
    /** `[{ exerciseId, involvementPct, sets90d, w, pct }]`, highest weight first. */
    contributorsJson: text("contributors_json").notNull().default("[]"),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.muscleId] })],
);

export const strengthSummary = sqliteTable("strength_summary", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  overallPct: real("overall_pct"),
  overallStep: integer("overall_step"),
  /** `[{ id, pct, step }]` for ranked groups. */
  groupsJson: text("groups_json").notNull().default("[]"),
  rankedExercises: integer("ranked_exercises").notNull().default(0),
  groupsCovered: integer("groups_covered").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

/** One row per display-step increase (first rank counts). Feeds `tierChanges` + analytics. */
export const strengthEvents = sqliteTable(
  "strength_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: text("session_id"),
    scope: text("scope", { enum: ["exercise", "muscle", "group", "overall"] }).notNull(),
    refId: text("ref_id").notNull(),
    fromStep: integer("from_step"),
    toStep: integer("to_step").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("strength_events_user_session_idx").on(t.userId, t.sessionId)],
);
