import type { CompleteSessionBody, PatchSessionBody, TierChange, WorkoutSessionResponse } from "@mirra/contracts";
import { and, eq, isNull } from "drizzle-orm";

import type { AppDB } from "../db";
import { workoutSessions } from "../db/schema";
import { msToUnix } from "../lib/dates";
import { notFound } from "../lib/errors";
import { recordAttendanceSafe } from "./attendance";
import { refreshGoalSafe } from "./goal-refresh";
import { rebuildDaysSafe } from "./nutrition-rollup";
import { recomputeStrengthSafe } from "./strength-recompute";

type SessionRow = typeof workoutSessions.$inferSelect;

export const toSessionResponse = (row: SessionRow): WorkoutSessionResponse => ({
  id: row.id,
  workoutId: row.workoutId,
  startedAt: msToUnix(row.startedAt) ?? 0,
  endedAt: msToUnix(row.endedAt),
  rpe: row.rpe,
  notes: row.notes,
});

/** Side effects of the first complete. Injectable so tests can count strength / goal recomputes. */
export type CompleteEffects = {
  recompute: (db: AppDB, userId: string, sessionId: string) => Promise<TierChange[]>;
  /** AMI-179 goal snapshot refresh (must never throw). Omitted = `refreshGoalSafe`. */
  goal?: (db: AppDB, userId: string) => Promise<void>;
};

const refreshGoalOnComplete = (db: AppDB, userId: string) => refreshGoalSafe(db, userId, "workout");
const defaultEffects: CompleteEffects = { recompute: recomputeStrengthSafe, goal: refreshGoalOnComplete };

export const loadOwnedSession = async (db: AppDB, userId: string, sessionId: string): Promise<SessionRow> => {
  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)))
    .limit(1);
  if (!session) throw notFound("Session not found");
  return session;
};

/** Only the fields the caller sent; `undefined` keeps the stored value. */
const sentFields = (body: PatchSessionBody): Partial<Pick<SessionRow, "rpe" | "notes">> => ({
  ...(body.rpe !== undefined ? { rpe: body.rpe } : {}),
  ...(body.notes !== undefined ? { notes: body.notes } : {}),
});

/** RPE / notes on a session, before or after completion. No attendance or strength work. */
export const updateSession = async (
  db: AppDB,
  userId: string,
  sessionId: string,
  body: PatchSessionBody,
): Promise<WorkoutSessionResponse> => {
  const session = await loadOwnedSession(db, userId, sessionId);
  const patch = sentFields(body);
  if (Object.keys(patch).length) {
    await db.update(workoutSessions).set(patch).where(eq(workoutSessions.id, sessionId));
  }
  return toSessionResponse({ ...session, ...patch });
};

/**
 * Ends the session once: attendance, nutrition rollup and the strength recompute run on the
 * first call only (tier promotions come back then). A repeat complete is idempotent: it saves
 * any RPE / notes it carries and returns `tierChanges: []` (AMI-172: HUD Finish, then S17 Done).
 */
export const completeSession = async (
  db: AppDB,
  userId: string,
  sessionId: string,
  body: CompleteSessionBody,
  effects: CompleteEffects = defaultEffects,
): Promise<WorkoutSessionResponse> => {
  const session = await loadOwnedSession(db, userId, sessionId);
  // A repeat never clears: a null / missing RPE keeps what an earlier call stored.
  const kept: PatchSessionBody = { rpe: body.rpe ?? undefined, notes: body.notes ?? undefined };
  const repeat = async () => ({ ...(await updateSession(db, userId, sessionId, kept)), tierChanges: [] });
  if (session.endedAt) return repeat();

  const now = new Date();
  const patch = { endedAt: now, rpe: body.rpe ?? null, notes: body.notes ?? null };
  // Claim the end atomically so two racing completes never both recompute strength.
  const claimed = await db
    .update(workoutSessions)
    .set(patch)
    .where(and(eq(workoutSessions.id, sessionId), isNull(workoutSessions.endedAt)))
    .returning({ id: workoutSessions.id });
  if (claimed.length === 0) return repeat();
  await recordAttendanceSafe(db, userId, "workoutDone");
  await rebuildDaysSafe(db, userId, [session.startedAt]);
  const tierChanges = await effects.recompute(db, userId, sessionId);
  // After strength so a step-up this session counts toward the goal's strength milestone.
  await (effects.goal ?? refreshGoalOnComplete)(db, userId);
  return { ...toSessionResponse({ ...session, ...patch }), tierChanges };
};
