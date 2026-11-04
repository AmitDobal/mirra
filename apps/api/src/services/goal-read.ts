/**
 * `GET /v1/goal` + `POST /v1/goal/restart` bodies (arch §5, AMI-179).
 * ETag = `"<plan.version>-<snapshot.updated_at>"`; a fresh snapshot + matching ETag is a 304
 * without running the engine. Users onboarded before goal plans get a v1 lazily (`backfill`).
 */
import { ENGINE_VERSION, GoalResponseSchema, type GoalResponse } from "@mirra/contracts";

import type { AppDB } from "../db";
import { ApiError, notFound } from "../lib/errors";
import { emptyGoalResponse, settingsOfPlan, toGoalResponse } from "../lib/goal";
import { loadGoalBase, loadLatestChange, todayFor, type GoalPlanRow } from "./goal-load";
import { computeGoal, ensurePlan, refreshGoal } from "./goal-refresh";
import {
  goalEtag,
  restartedOn,
  selectSnapshot,
  snapshotRowOf,
  upsertSnapshot,
  writePlanVersion,
  type SnapshotRow,
} from "./goal-store";

export type GoalRead =
  | { kind: "not_modified"; etag: string }
  | { kind: "ok"; etag: string | null; body: GoalResponse };

/** `If-None-Match` may be a list and may carry `W/`. */
export const etagMatches = (header: string | null | undefined, etag: string): boolean =>
  !!header &&
  header
    .split(",")
    .map((t) => t.trim().replace(/^W\//, ""))
    .some((t) => t === etag || t === "*");

const isFresh = (snap: SnapshotRow | undefined, plan: GoalPlanRow, latestChange: number): snap is SnapshotRow =>
  !!snap &&
  snap.goalPlanId === plan.id &&
  snap.engineVersion === ENGINE_VERSION &&
  snap.updatedAt.getTime() >= Math.max(latestChange, plan.createdAt.getTime());

export const readGoal = async (
  db: AppDB,
  userId: string,
  opts: { now?: Date; ifNoneMatch?: string | null } = {},
): Promise<GoalRead> => {
  const now = opts.now ?? new Date();
  const base = await loadGoalBase(db, userId);
  const plan = await ensurePlan(db, userId, base, now);
  if (!plan) return { kind: "ok", etag: null, body: emptyGoalResponse() };

  const today = todayFor(base, now);
  const [[snap], latest] = await Promise.all([selectSnapshot(db, userId, today), loadLatestChange(db, userId, now)]);
  const fresh = isFresh(snap, plan, latest);
  if (fresh && etagMatches(opts.ifNoneMatch, goalEtag(plan, snap))) {
    return { kind: "not_modified", etag: goalEtag(plan, snap) };
  }

  const computed = await computeGoal(db, userId, base, plan, now);
  const snapshot = fresh
    ? snap
    : await upsertSnapshot(
        db,
        snapshotRowOf(plan, computed.projection, {
          localDate: today,
          trendSpanDays: computed.trendSpanDays,
          trigger: "read",
          now,
        }),
      );
  return {
    kind: "ok",
    etag: goalEtag(plan, snapshot),
    body: GoalResponseSchema.parse(toGoalResponse(plan, computed.projection)),
  };
};

/**
 * New version from today's trend weight (else latest weight), same target / pace / inputs and
 * commitment, start date today. Max one restart per local day (429 after).
 */
export const restartGoal = async (
  db: AppDB,
  userId: string,
  now: Date = new Date(),
): Promise<{ etag: string; body: GoalResponse }> => {
  const base = await loadGoalBase(db, userId);
  const plan = await ensurePlan(db, userId, base, now);
  if (!plan) throw notFound("No goal yet. Finish onboarding first.");
  const today = todayFor(base, now);
  if (await restartedOn(db, userId, today)) {
    throw new ApiError("rate_limited", "You already restarted your goal today. Try again tomorrow.", 429);
  }
  const { projection } = await computeGoal(db, userId, base, plan, now);
  base.plan = await writePlanVersion(db, {
    userId,
    settings: settingsOfPlan(plan, base.prefs?.units === "imperial" ? "imperial" : "metric"),
    startDate: today,
    startWeightKg: projection.trendKg ?? base.profile?.weightKg ?? plan.startWeightKg,
    reason: "restart",
    committedAt: plan.committedAt,
    now,
  });
  const r = await refreshGoal(db, userId, "restart", now, base);
  if (!r) throw notFound("No goal yet. Finish onboarding first.");
  return { etag: goalEtag(r.plan, r.snapshot), body: GoalResponseSchema.parse(toGoalResponse(r.plan, r.projection)) };
};
