/**
 * Goal recompute (arch §5, AMI-179). Triggers call the `*Safe` wrappers after their main write:
 * a goal failure is logged and swallowed, never failing or rolling back the parent request.
 */
import { goalEngine, projectGoal, type GoalProjection } from "@mirra/contracts";

import type { AppDB } from "../db";
import { localDateIn } from "../lib/dates";
import { settingsChanged, settingsFrom, settingsOfPlan, touchesGoal } from "../lib/goal";
import {
  loadFirstWeight,
  loadGoalBase,
  loadGoalInput,
  todayFor,
  type GoalBase,
  type GoalPlanRow,
} from "./goal-load";
import { setPlanCommitment, snapshotRowOf, upsertSnapshot, writePlanVersion, type GoalTrigger, type SnapshotRow } from "./goal-store";

export type GoalComputed = {
  plan: GoalPlanRow;
  projection: GoalProjection;
  today: string;
  trendSpanDays: number;
};

const unitsOf = (base: GoalBase) => (base.prefs?.units === "imperial" ? "imperial" : "metric");

/**
 * Lazy v1 for users onboarded before goal plans existed (§4 backfill): start = earliest weigh-in,
 * else profile weight; start date = onboarding day. No onboarding → no plan.
 */
export const ensurePlan = async (
  db: AppDB,
  userId: string,
  base: GoalBase,
  now: Date,
): Promise<GoalPlanRow | null> => {
  if (base.plan) return base.plan;
  const completedAt = base.profile?.onboardingCompletedAt;
  if (!completedAt) return null;
  const startWeightKg = (await loadFirstWeight(db, userId)) ?? base.profile?.weightKg ?? null;
  const startDate = localDateIn(base.tz, completedAt);
  const plan = await writePlanVersion(db, {
    userId,
    settings: settingsFrom(base.profile, base.prefs),
    startDate: startDate > todayFor(base, now) ? todayFor(base, now) : startDate,
    startWeightKg,
    reason: "backfill",
    committedAt: null,
    now,
  });
  base.plan = plan;
  return plan;
};

/** Load behaviour and run the engine for `plan` today (no writes). */
export const computeGoal = async (
  db: AppDB,
  userId: string,
  base: GoalBase,
  plan: GoalPlanRow,
  now: Date,
): Promise<GoalComputed> => {
  const today = todayFor(base, now);
  const input = await loadGoalInput(db, userId, base, plan, today, now);
  const projection = projectGoal(input);
  const trendSpanDays = goalEngine.computeTrend(input.logs ?? [], plan.startDate, today).spanDays;
  return { plan, projection, today, trendSpanDays };
};

export type GoalRefreshed = GoalComputed & { snapshot: SnapshotRow };

/** Project and upsert today's snapshot. Creates a backfill plan when needed; null without onboarding. */
export const refreshGoal = async (
  db: AppDB,
  userId: string,
  trigger: GoalTrigger,
  now: Date = new Date(),
  base?: GoalBase,
): Promise<GoalRefreshed | null> => {
  const b = base ?? (await loadGoalBase(db, userId));
  const plan = await ensurePlan(db, userId, b, now);
  if (!plan) return null;
  const computed = await computeGoal(db, userId, b, plan, now);
  const snapshot = await upsertSnapshot(
    db,
    snapshotRowOf(plan, computed.projection, {
      localDate: todayFor(b, now),
      trendSpanDays: computed.trendSpanDays,
      trigger,
      now,
    }),
  );
  return { ...computed, snapshot };
};

const logGoalError = (where: string, userId: string, err: unknown) => {
  console.warn(`[goal] ${where} failed for ${userId}:`, err instanceof Error ? err.message : err);
};

/** Behaviour trigger (weight log, workout complete, check-in): snapshot only. Never throws. */
export const refreshGoalSafe = async (
  db: AppDB,
  userId: string,
  trigger: GoalTrigger,
  now: Date = new Date(),
): Promise<void> => {
  try {
    await refreshGoal(db, userId, trigger, now);
  } catch (err) {
    logGoalError(`refresh(${trigger})`, userId, err);
  }
};

/**
 * `PUT /v1/onboarding`: a fresh plan version from today's answers (start = onboarding weight),
 * carrying the S43 commitment. Re-onboarding (`reset: true`) supersedes the old plan.
 */
export const startGoalFromOnboarding = async (
  db: AppDB,
  userId: string,
  committedAt: number | null,
  now: Date = new Date(),
): Promise<GoalRefreshed | null> => {
  const base = await loadGoalBase(db, userId);
  const plan = await writePlanVersion(db, {
    userId,
    settings: settingsFrom(base.profile, base.prefs),
    startDate: todayFor(base, now),
    startWeightKg: base.profile?.weightKg ?? null,
    reason: "onboarding",
    committedAt,
    now,
  });
  base.plan = plan;
  return refreshGoal(db, userId, "onboarding", now, base);
};

export const startGoalFromOnboardingSafe = async (
  db: AppDB,
  userId: string,
  committedAt: number | null,
  now: Date = new Date(),
): Promise<void> => {
  try {
    await startGoalFromOnboarding(db, userId, committedAt, now);
  } catch (err) {
    logGoalError("onboarding", userId, err);
  }
};

/**
 * `PATCH /v1/me/profile`: a new version (same start date, frozen start weight, same commitment)
 * only when the body has a §4 key and the resulting settings differ; else snapshot refresh only.
 */
export const applyProfileEdit = async (
  db: AppDB,
  userId: string,
  body: Record<string, unknown>,
  now: Date = new Date(),
): Promise<GoalRefreshed | null> => {
  const base = await loadGoalBase(db, userId);
  const plan = await ensurePlan(db, userId, base, now);
  if (!plan) return null;
  const next = settingsFrom(base.profile, base.prefs);
  if (touchesGoal(body) && settingsChanged(settingsOfPlan(plan, unitsOf(base)), next)) {
    base.plan = await writePlanVersion(db, {
      userId,
      settings: next,
      startDate: plan.startDate,
      startWeightKg: plan.startWeightKg,
      reason: "profile_edit",
      committedAt: plan.committedAt,
      now,
    });
  }
  return refreshGoal(db, userId, "profile_edit", now, base);
};

export const applyProfileEditSafe = async (
  db: AppDB,
  userId: string,
  body: Record<string, unknown>,
  now: Date = new Date(),
): Promise<void> => {
  try {
    await applyProfileEdit(db, userId, body, now);
  } catch (err) {
    logGoalError("profile_edit", userId, err);
  }
};

/**
 * `PATCH /v1/me/profile` with `commitment` (AMI-182): the S43 commit made before sign-in when the
 * post-auth sync skipped the onboarding PUT. Sets `committed_at` only when the active plan has none.
 */
export const commitGoalSafe = async (
  db: AppDB,
  userId: string,
  committedAt: number,
  now: Date = new Date(),
): Promise<void> => {
  try {
    const base = await loadGoalBase(db, userId);
    const plan = await ensurePlan(db, userId, base, now);
    if (plan && plan.committedAt === null) await setPlanCommitment(db, userId, plan.id, committedAt);
  } catch (err) {
    logGoalError("commit", userId, err);
  }
};
