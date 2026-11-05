import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { users } from "./auth";

/**
 * Versioned goal plan (arch `docs/03-engineering/goal-timeline.md` §4, AMI-179).
 * One `active` row per user (partial unique index); older versions are `superseded`.
 * `start_weight_kg` is frozen: `POST /v1/weight` overwrites `profiles.weight_kg`, never this.
 */
export const goalPlans = sqliteTable(
  "goal_plans",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    status: text("status", { enum: ["active", "superseded"] }).notNull(),
    goalType: text("goal_type").notNull(),
    primaryGoal: text("primary_goal").notNull(),
    pace: text("pace"),
    direction: text("direction", { enum: ["down", "up", "hold"] }).notNull(),
    mode: text("mode", { enum: ["eta", "horizon", "milestones"] }).notNull(),
    /** User-local `YYYY-MM-DD`. */
    startDate: text("start_date").notNull(),
    startWeightKg: real("start_weight_kg"),
    targetWeightKg: real("target_weight_kg"),
    /** Target after the BMI 18.5 clamp. */
    targetEffectiveKg: real("target_effective_kg"),
    paceRatePct: real("pace_rate_pct").notNull(),
    paceRateKg: real("pace_rate_kg").notNull(),
    kcalHint: integer("kcal_hint"),
    etaExpected: text("eta_expected"),
    etaOptimistic: text("eta_optimistic"),
    etaConservative: text("eta_conservative"),
    weeksExpected: real("weeks_expected"),
    /** Weekly kg points from start at the prior expected rate (≤105). */
    plannedLineJson: text("planned_line_json").notNull(),
    flagsJson: text("flags_json").notNull().default("[]"),
    /** `{ sex, ageYears, heightCm, experience, trainDays, units }`. */
    inputsJson: text("inputs_json").notNull(),
    engineVersion: text("engine_version").notNull(),
    reason: text("reason", { enum: ["onboarding", "profile_edit", "restart", "backfill"] }).notNull(),
    committedAt: integer("committed_at"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    uniqueIndex("goal_plans_user_version_uq").on(t.userId, t.version),
    uniqueIndex("goal_plans_active_uq").on(t.userId).where(sql`${t.status} = 'active'`),
  ],
);

/** Today's projection, one row per user per local day (upserted; doubles as estimate history). */
export const goalSnapshots = sqliteTable(
  "goal_snapshots",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    goalPlanId: text("goal_plan_id")
      .notNull()
      .references(() => goalPlans.id, { onDelete: "cascade" }),
    localDate: text("local_date").notNull(),
    trendWeightKg: real("trend_weight_kg"),
    observedRateKg: real("observed_rate_kg"),
    trendSpanDays: integer("trend_span_days"),
    adherence: real("adherence").notNull(),
    /** `{ training: { done, planned }, fuel: { onTarget, logged } | null, checkIn: { days, of } }`. */
    adherenceJson: text("adherence_json").notNull(),
    status: text("status").notNull(),
    etaExpected: text("eta_expected"),
    etaOptimistic: text("eta_optimistic"),
    etaConservative: text("eta_conservative"),
    whatIfEta: text("what_if_eta"),
    milestonesJson: text("milestones_json").notNull(),
    trigger: text("trigger").notNull(),
    engineVersion: text("engine_version").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    uniqueIndex("goal_snapshots_user_date_uq").on(t.userId, t.localDate),
    index("goal_snapshots_plan_idx").on(t.goalPlanId, t.localDate),
  ],
);
