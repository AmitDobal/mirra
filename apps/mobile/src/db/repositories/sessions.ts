import { z } from "zod";

import { getDb } from "../client";
import { LOCAL_USER_ID, newId, nowMs } from "../ids";
import { toJson } from "../json";

const StartSchema = z.object({
  userId: z.string().optional(),
  workoutId: z.string().nullable().optional(),
});

const LogSetSchema = z.object({
  sessionId: z.string().min(1),
  exerciseId: z.string().nullable().optional(),
  exerciseName: z.string().min(1),
  setIndex: z.number().int().nonnegative(),
  weightKg: z.number().nonnegative().nullable().optional(),
  reps: z.number().int().nonnegative().nullable().optional(),
  completed: z.boolean().optional(),
});

const CompleteSchema = z.object({
  sessionId: z.string().min(1),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type StartSessionInput = z.infer<typeof StartSchema>;
export type LogSetInput = z.infer<typeof LogSetSchema>;
export type CompleteSessionInput = z.infer<typeof CompleteSchema>;

export type LocalSession = {
  readonly id: string;
  readonly userId: string;
  readonly workoutId: string | null;
  readonly startedAt: number;
  readonly endedAt: number | null;
  readonly rpe: number | null;
  readonly notes: string | null;
};

export type LocalSetLog = {
  readonly id: string;
  readonly sessionId: string;
  readonly exerciseId: string | null;
  readonly exerciseName: string;
  readonly setIndex: number;
  readonly weightKg: number | null;
  readonly reps: number | null;
  readonly completed: boolean;
  readonly loggedAt: number;
};

export const startSession = async (
  input: StartSessionInput = {},
): Promise<LocalSession> => {
  const data = StartSchema.parse(input);
  const userId = data.userId ?? LOCAL_USER_ID;
  const db = await getDb();
  const id = newId("sess");
  const startedAt = nowMs();

  await db.runAsync(
    `INSERT INTO workout_sessions (id, user_id, workout_id, started_at, ended_at, rpe, notes, totals_json)
     VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL)`,
    id,
    userId,
    data.workoutId ?? null,
    startedAt,
  );

  return {
    id,
    userId,
    workoutId: data.workoutId ?? null,
    startedAt,
    endedAt: null,
    rpe: null,
    notes: null,
  };
};

export const logSet = async (input: LogSetInput): Promise<LocalSetLog> => {
  const data = LogSetSchema.parse(input);
  const db = await getDb();
  const id = newId("set");
  const loggedAt = nowMs();
  const completed = data.completed !== false;

  await db.runAsync(
    `INSERT INTO set_logs (
      id, session_id, exercise_id, exercise_name, set_index, weight_kg, reps, completed, logged_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    data.sessionId,
    data.exerciseId ?? null,
    data.exerciseName,
    data.setIndex,
    data.weightKg ?? null,
    data.reps ?? null,
    completed ? 1 : 0,
    loggedAt,
  );

  return {
    id,
    sessionId: data.sessionId,
    exerciseId: data.exerciseId ?? null,
    exerciseName: data.exerciseName,
    setIndex: data.setIndex,
    weightKg: data.weightKg ?? null,
    reps: data.reps ?? null,
    completed,
    loggedAt,
  };
};

export const completeSession = async (
  input: CompleteSessionInput,
): Promise<LocalSession> => {
  const data = CompleteSchema.parse(input);
  const db = await getDb();
  const endedAt = nowMs();

  const session = await db.getFirstAsync<{
    id: string;
    user_id: string;
    workout_id: string | null;
    started_at: number;
  }>("SELECT * FROM workout_sessions WHERE id = ?", data.sessionId);

  if (!session) throw new Error(`Session not found: ${data.sessionId}`);

  const setCount = await db.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM set_logs WHERE session_id = ? AND completed = 1",
    data.sessionId,
  );
  const durationMin = Math.max(1, Math.round((endedAt - session.started_at) / 60_000));
  const totals = { durationMin, setsCompleted: setCount?.n ?? 0 };

  await db.runAsync(
    `UPDATE workout_sessions SET ended_at = ?, rpe = ?, notes = ?, totals_json = ? WHERE id = ?`,
    endedAt,
    data.rpe ?? null,
    data.notes ?? null,
    toJson(totals),
    data.sessionId,
  );

  return {
    id: session.id,
    userId: session.user_id,
    workoutId: session.workout_id,
    startedAt: session.started_at,
    endedAt,
    rpe: data.rpe ?? null,
    notes: data.notes ?? null,
  };
};
