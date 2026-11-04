/**
 * Goal plan versions + daily snapshots (arch §4, AMI-179). Every write filters `user_id`.
 * A new version supersedes the active one in a single `db.batch` (partial unique index keeps one active).
 */
import { goalEngine, projectGoal, type GoalProjection } from "@mirra/contracts";
import { and, eq, sql } from "drizzle-orm";

import type { AppDB } from "../db";
import { goalPlans, goalSnapshots } from "../db/schema";
import { inputsJsonOf, profileInputOf, type GoalSettings } from "../lib/goal";
import { newId } from "../lib/id";
import type { GoalPlanRow } from "./goal-load";

export type PlanReason = GoalPlanRow["reason"];
export type GoalTrigger =
  | "onboarding"
  | "profile_edit"
  | "weight"
  | "workout"
  | "check_in"
  | "restart"
  | "backfill"
  | "read";
export type SnapshotRow = typeof goalSnapshots.$inferSelect;

export type NewPlanInput = {
  userId: string;
  settings: GoalSettings;
  startDate: string;
  startWeightKg: number | null;
  reason: PlanReason;
  committedAt: number | null;
  now: Date;
};

/**
 * Plan row from the engine on its start date with no behaviour yet: frozen start weight,
 * the planned line (prior expected rate) and the day-0 ETA band (`originalEta`).
 */
export const buildPlanRow = (input: NewPlanInput, version: number): GoalPlanRow => {
  const g = projectGoal({
    profile: profileInputOf(input.settings, input.startWeightKg),
    startDate: input.startDate,
    today: input.startDate,
  });
  return {
    id: newId(),
    userId: input.userId,
    version,
    status: "active",
    goalType: input.settings.goalType,
    primaryGoal: input.settings.primaryGoal,
    pace: input.settings.pace,
    direction: g.direction,
    mode: g.mode,
    startDate: input.startDate,
    startWeightKg: input.startWeightKg,
    targetWeightKg: input.settings.targetWeightKg,
    targetEffectiveKg: g.targetEffectiveKg,
    paceRatePct: g.paceRatePct,
    paceRateKg: g.paceRateKg,
    kcalHint: g.kcalHint,
    etaExpected: g.band.expected,
    etaOptimistic: g.band.optimistic,
    etaConservative: g.band.conservative,
    weeksExpected: g.band.weeksExpected,
    plannedLineJson: JSON.stringify(g.plannedLine.slice(0, goalEngine.MAX_WEEKS + 1)),
    flagsJson: JSON.stringify(g.flags),
    inputsJson: JSON.stringify(inputsJsonOf(input.settings)),
    engineVersion: g.engineVersion,
    reason: input.reason,
    committedAt: input.committedAt,
    createdAt: input.now,
  };
};

/** Supersede the active plan (if any) and insert the next version, atomically. */
export const writePlanVersion = async (db: AppDB, input: NewPlanInput): Promise<GoalPlanRow> => {
  const [top] = await db
    .select({ v: sql<number>`coalesce(max(${goalPlans.version}), 0)` })
    .from(goalPlans)
    .where(eq(goalPlans.userId, input.userId));
  const row = buildPlanRow(input, Number(top?.v ?? 0) + 1);
  await db.batch([
    db
      .update(goalPlans)
      .set({ status: "superseded" })
      .where(and(eq(goalPlans.userId, input.userId), eq(goalPlans.status, "active"))),
    db.insert(goalPlans).values(row),
  ]);
  return row;
};

export const snapshotRowOf = (
  plan: GoalPlanRow,
  g: GoalProjection,
  opts: { localDate: string; trendSpanDays: number; trigger: GoalTrigger; now: Date },
): SnapshotRow => ({
  id: newId(),
  userId: plan.userId,
  goalPlanId: plan.id,
  localDate: opts.localDate,
  trendWeightKg: g.trendKg,
  observedRateKg: g.observedKgWk,
  trendSpanDays: opts.trendSpanDays,
  adherence: g.adherence.score,
  adherenceJson: JSON.stringify(g.adherence.counts),
  status: g.status,
  etaExpected: g.band.expected,
  etaOptimistic: g.band.optimistic,
  etaConservative: g.band.conservative,
  whatIfEta: g.whatIf?.eta ?? null,
  milestonesJson: JSON.stringify(g.milestones),
  trigger: opts.trigger,
  engineVersion: g.engineVersion,
  updatedAt: opts.now,
});

/** One row per user per local day: insert, or overwrite today's row. */
export const upsertSnapshot = async (db: AppDB, row: SnapshotRow): Promise<SnapshotRow> => {
  const { id: _id, userId: _u, localDate: _d, ...set } = row;
  const [out] = await db
    .insert(goalSnapshots)
    .values(row)
    .onConflictDoUpdate({ target: [goalSnapshots.userId, goalSnapshots.localDate], set })
    .returning();
  return out ?? row;
};

export const selectSnapshot = (db: AppDB, userId: string, localDate: string) =>
  db
    .select()
    .from(goalSnapshots)
    .where(and(eq(goalSnapshots.userId, userId), eq(goalSnapshots.localDate, localDate)))
    .limit(1);

/** True when a restart already happened on `today` (max one per day). */
export const restartedOn = async (db: AppDB, userId: string, today: string): Promise<boolean> => {
  const [row] = await db
    .select({ id: goalPlans.id })
    .from(goalPlans)
    .where(and(eq(goalPlans.userId, userId), eq(goalPlans.reason, "restart"), eq(goalPlans.startDate, today)))
    .limit(1);
  return row !== undefined;
};

export const goalEtag = (plan: Pick<GoalPlanRow, "version">, snap: Pick<SnapshotRow, "updatedAt">): string =>
  `"${plan.version}-${snap.updatedAt.getTime()}"`;
