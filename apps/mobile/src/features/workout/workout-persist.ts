import {
  completeSession as dbCompleteSession,
  logSet as dbLogSet,
  startSession as dbStartSession,
} from "@/db";
import {
  completeSession as apiCompleteSession,
  logSet as apiLogSet,
  startSession as apiStartSession,
  type LogSetBody,
  type PlanExercise,
} from "@/lib/api";
import type { ApiTierChange } from "@/lib/api/strength-exercise";
import { errorMessage, logger } from "@/lib/logger";

/** Where the active session row lives. */
export type SessionSource = "api" | "local" | "none";

export type SetDraft = {
  readonly weightKg: number;
  readonly reps: number;
};

/** One set chip. `weightKg`/`reps` are the logged values once `done`. */
export type SetSlot = {
  readonly n: number;
  readonly weightKg: number | null;
  readonly reps: number | null;
  readonly done: boolean;
};

export const DEFAULT_REPS = 8;


/** "8-12" → 8. */
export const parseReps = (targetReps: string): number | null =>
  Number.parseInt(String(targetReps), 10) || null;

/** Plan target: planned load (when the plan has one) × planned reps. */
export const planDraft = (ex: PlanExercise): SetDraft => ({
  weightKg: ex.targetLoadKg ?? 0,
  reps: parseReps(ex.targetReps) ?? DEFAULT_REPS,
});

/** API session first, local SQLite when the API is unreachable. */
export const openSession = async (
  workoutId: string,
): Promise<{ sessionId: string | null; sessionSource: SessionSource }> => {
  try {
    const sess = await apiStartSession({ workoutId });
    return { sessionId: sess.id, sessionSource: "api" };
  } catch (err) {
    logger.warn("workout.start.api_failed_using_local", { message: errorMessage(err) });
  }
  try {
    const sess = await dbStartSession({ workoutId });
    return { sessionId: sess.id, sessionSource: "local" };
  } catch (err) {
    logger.error("workout.start.local_failed", { message: errorMessage(err) });
    return { sessionId: null, sessionSource: "none" };
  }
};

/** API set logs use a 1-based `setIndex`; local SQLite is 0-based. */
export const persistSet = async (
  source: SessionSource,
  sessionId: string,
  body: LogSetBody,
): Promise<void> => {
  if (source === "api") {
    try {
      await apiLogSet(sessionId, body);
      return;
    } catch (err) {
      logger.warn("workout.log_set.api_failed_using_local", {
        message: errorMessage(err),
      });
    }
  }
  try {
    await dbLogSet({ ...body, sessionId, setIndex: Math.max(0, body.setIndex - 1) });
  } catch (err) {
    logger.error("workout.log_set.local_failed", { message: errorMessage(err) });
  }
};

/** Completes the session; returns the API tier promotions (empty for local / failed). */
export const persistComplete = async (
  source: SessionSource,
  sessionId: string,
  rpe: number | null,
): Promise<readonly ApiTierChange[]> => {
  if (source === "api") {
    try {
      const res = await apiCompleteSession(sessionId, { rpe });
      return res.tierChanges ?? [];
    } catch (err) {
      logger.warn("workout.complete.api_failed_using_local", {
        message: errorMessage(err),
      });
    }
  }
  try {
    await dbCompleteSession({ sessionId, rpe });
  } catch (err) {
    logger.error("workout.complete.local_failed", { message: errorMessage(err) });
  }
  return [];
};

/** Active seconds since start, excluding finished and current pauses. */
export const activeSeconds = (
  startedAt: number | null,
  pausedTotalMs: number,
  pauseStartedAt: number | null,
  now = Date.now(),
): number => {
  if (!startedAt) return 0;
  const currentPause = pauseStartedAt ? now - pauseStartedAt : 0;
  return Math.max(0, Math.floor((now - startedAt - pausedTotalMs - currentPause) / 1000));
};

export const buildSets = (ex: PlanExercise): SetSlot[] =>
  Array.from({ length: Math.max(1, ex.targetSets) }, (_, i) => ({
    n: i + 1,
    weightKg: null,
    reps: null,
    done: false,
  }));

export const clampValue = (field: keyof SetDraft, value: number): number => {
  if (!Number.isFinite(value)) return 0;
  const bounded = Math.min(Math.max(value, 0), field === "reps" ? 99 : 999);
  return field === "reps" ? Math.round(bounded) : Math.round(bounded * 100) / 100;
};
