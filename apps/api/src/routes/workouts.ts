import {
  CompleteSessionBodySchema,
  HistoryQuerySchema,
  WorkoutHistoryQuerySchema,
  type WorkoutHistoryListResponse,
  type WorkoutSummaryResponse,
  CreateWorkoutSessionBodySchema,
  LogSetBodySchema,
  PatchSessionBodySchema,
  type SetLogResponse,
  type WorkoutSessionResponse,
} from "@mirra/contracts";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../db";
import { setLogs, workoutSessions, workouts } from "../db/schema";
import type { MirraEnv } from "../env";
import { todayUtc } from "../lib/dates";
import { badRequest, notFound } from "../lib/errors";
import { newId } from "../lib/id";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { loadCurrentPlan } from "../services/plan-loaders";
import { completeSession, toSessionResponse, updateSession } from "../services/workout-complete";
import { loadWorkoutHistory, loadWorkoutSummary } from "../services/workout-summary";

export const workoutRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

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

  return c.json(toSessionResponse({
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

/** First call ends the session (tier changes); a repeat only saves RPE / notes (AMI-172). */
workoutRoutes.post("/v1/workouts/sessions/:id/complete", requireAuth, async (c) => {
  const raw = await c.req.json().catch(() => ({}));
  const body = parseBody(CompleteSessionBodySchema, raw ?? {});
  const response: WorkoutSessionResponse = await completeSession(
    createDb(c.env.DB),
    c.get("userId"),
    c.req.param("id"),
    body,
  );
  return c.json(response);
});

/** Save RPE / notes (S17 "How hard was it?") without re-running completion. */
workoutRoutes.patch("/v1/workouts/sessions/:id", requireAuth, async (c) => {
  const body = parseBody(PatchSessionBodySchema, await c.req.json().catch(() => ({})));
  const response: WorkoutSessionResponse = await updateSession(
    createDb(c.env.DB),
    c.get("userId"),
    c.req.param("id"),
    body,
  );
  return c.json(response);
});

/** Session history list (`from` / `to` are YYYY-MM-DD, default last 30 days). */
workoutRoutes.get("/v1/workouts/sessions", requireAuth, async (c) => {
  const q = parseBody(WorkoutHistoryQuerySchema, c.req.query());
  const body: WorkoutHistoryListResponse = await loadWorkoutHistory(
    createDb(c.env.DB),
    c.get("userId"),
    todayUtc(),
    q,
  );
  return c.json(body);
});

/** Minutes / sets / volume series for day | week | month charts. */
workoutRoutes.get("/v1/workouts/summary", requireAuth, async (c) => {
  const q = parseBody(HistoryQuerySchema, c.req.query());
  const body: WorkoutSummaryResponse = await loadWorkoutSummary(
    createDb(c.env.DB),
    c.get("userId"),
    q.range,
    q.anchor ?? todayUtc(),
  );
  return c.json(body);
});
