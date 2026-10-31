import {
  completeSession as dbCompleteSession,
  logSet as dbLogSet,
} from "@/db";
import {
  completeSession as apiCompleteSession,
  logSet as apiLogSet,
  type LogSetBody,
  type PlanExercise,
} from "@/lib/api";
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

export const persistComplete = async (
  source: SessionSource,
  sessionId: string,
  rpe: number | null,
): Promise<void> => {
  if (source === "api") {
    try {
      await apiCompleteSession(sessionId, { rpe });
      return;
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
