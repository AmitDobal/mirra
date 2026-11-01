import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./auth";

const nowMs = sql`(unixepoch() * 1000)`;

export const profiles = sqliteTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  sex: text("sex"),
  ageYears: integer("age_years"),
  heightCm: real("height_cm"),
  weightKg: real("weight_kg"),
  goalWeightKg: real("goal_weight_kg"),
  pace: text("pace"),
  timezone: text("timezone").notNull().default("UTC"),
  onboardingCompletedAt: integer("onboarding_completed_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
});

export const preferences = sqliteTable("preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  primaryGoal: text("primary_goal").notNull(),
  experience: text("experience").notNull(),
  equipmentJson: text("equipment_json").notNull().default("[]"),
  trainDaysJson: text("train_days_json").notNull().default("[]"),
  sessionMinutes: integer("session_minutes").notNull().default(45),
  dietTagsJson: text("diet_tags_json").notNull().default("[]"),
  foodsAvoid: text("foods_avoid"),
  cuisineJson: text("cuisine_json").notNull().default("[]"),
  units: text("units").notNull().default("metric"),
  trainerPersona: text("trainer_persona").notNull().default("drill"),
  physiqueTarget: text("physique_target"),
  lifestyleNotes: text("lifestyle_notes"),
  /** gym | home | hotel — filters kit for coach/plan. */
  trainingLocation: text("training_location").notNull().default("gym"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
});
