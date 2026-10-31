import {
  CompleteSessionBodySchema,
  CreateWorkoutSessionBodySchema,
  LogSetBodySchema,
  type SetLogResponse,
  type WorkoutSessionResponse,
} from "@mirra/contracts";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../db";
import { setLogs, workoutSessions, workouts } from "../db/schema";
import type { MirraEnv } from "../env";
import { msToUnix } from "../lib/dates";
import { badRequest, notFound } from "../lib/errors";
import { newId } from "../lib/id";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { recordAttendanceSafe } from "../services/attendance";
import { loadCurrentPlan } from "../services/plan-loaders";

export const workoutRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

const toSession = (row: typeof workoutSessions.$inferSelect): WorkoutSessionResponse => ({
  id: row.id,
  workoutId: row.workoutId,
  startedAt: msToUnix(row.startedAt) ?? 0,
  endedAt: msToUnix(row.endedAt),
  rpe: row.rpe,
  notes: row.notes,
});

workoutRoutes.post("/v1/workouts/sessions", requireAuth, async (c) => {
  const body = parseBody(CreateWorkoutSessionBodySchema, await c.req.json());
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const current = await loadCurrentPlan(db, userId);
  const owned = current.workouts.some((w) => w.id === body.workoutId);
  if (!owned) {
    const [row] = await db
      .select()
      .from(workouts)
      .where(eq(workouts.id, body.workoutId))
      .limit(1);
    if (!row) throw notFound("Workout not found");
    throw badRequest("Workout not on your current plan");
  }

  const id = newId();
  const now = new Date();
  await db.insert(workoutSessions).values({
    id,
    userId,
    workoutId: body.workoutId,
    startedAt: now,
  });

  return c.json(toSession({
    id,
    userId,
    workoutId: body.workoutId,
    startedAt: now,
    endedAt: null,
    rpe: null,
    notes: null,
    totalsJson: null,
  }), 201);
});

workoutRoutes.post("/v1/workouts/sessions/:id/sets", requireAuth, async (c) => {
  const body = parseBody(LogSetBodySchema, await c.req.json());
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const sessionId = c.req.param("id");
  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)))
    .limit(1);
  if (!session) throw notFound("Session not found");
  if (session.endedAt) throw badRequest("Session already completed");

  const id = newId();
  const now = new Date();
  const completed = body.completed ?? true;
  await db.insert(setLogs).values({
    id,
    sessionId,
    exerciseId: body.exerciseId ?? null,
    exerciseName: body.exerciseName,
    setIndex: body.setIndex,
    weightKg: body.weightKg ?? null,
    reps: body.reps ?? null,
    completed,
    loggedAt: now,
  });

  const response: SetLogResponse = {
    id,
    sessionId,
    exerciseId: body.exerciseId ?? null,
    exerciseName: body.exerciseName,
    setIndex: body.setIndex,
    weightKg: body.weightKg ?? null,
    reps: body.reps ?? null,
    completed,
    loggedAt: now.getTime(),
  };
  return c.json(response, 201);
});

workoutRoutes.post("/v1/workouts/sessions/:id/complete", requireAuth, async (c) => {
  const raw = await c.req.json().catch(() => ({}));
  const body = parseBody(CompleteSessionBodySchema, raw ?? {});
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const sessionId = c.req.param("id");
  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)))
    .limit(1);
  if (!session) throw notFound("Session not found");
  if (session.endedAt) throw badRequest("Session already completed");

  const now = new Date();
  await db
    .update(workoutSessions)
    .set({
      endedAt: now,
      rpe: body.rpe ?? null,
      notes: body.notes ?? null,
    })
    .where(eq(workoutSessions.id, sessionId));
  await recordAttendanceSafe(db, userId, "workoutDone");

  return c.json(
    toSession({
      ...session,
      endedAt: now,
      rpe: body.rpe ?? null,
      notes: body.notes ?? null,
    }),
  );
});
