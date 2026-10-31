import { create } from "zustand";

import {
  getLastSetForExercise,
  startSession as dbStartSession,
} from "@/db";
import {
  startSession as apiStartSession,
  type PlanExercise,
  type PlanWorkout,
} from "@/lib/api";
import { errorMessage, logger } from "@/lib/logger";

import {
  DEFAULT_REPS,
  buildSets,
  clampValue,
  persistComplete,
  persistSet,
  planDraft,
  type SessionSource,
  type SetDraft,
  type SetSlot,
} from "./workout-persist";

export type { SessionSource, SetDraft, SetSlot } from "./workout-persist";

type WorkoutState = {
  readonly sessionId: string | null;
  readonly sessionSource: SessionSource;
  readonly workoutTitle: string;
  readonly exercises: readonly PlanExercise[];
  readonly exerciseIndex: number;
  readonly setIndex: number;
  readonly sets: readonly SetSlot[];
  readonly draft: SetDraft;
  /** Set number being edited (a logged chip), else null. */
  readonly editingSet: number | null;
  readonly paused: boolean;
  readonly startedAt: number | null;
  readonly pausedTotalMs: number;
  /** When current pause began; null if running. */
  readonly pauseStartedAt: number | null;
  readonly kcal: number;
  readonly rpe: number | null;
  readonly finished: boolean;
  readonly durationMin: number;
  readonly start: (workout: PlanWorkout | null, focusExerciseId?: string) => Promise<void>;
  /** Jump to one exercise; starts a session first if none is active. */
  readonly openExercise: (workout: PlanWorkout | null, exerciseId: string) => Promise<void>;
  readonly logSet: () => Promise<void>;
  readonly adjustDraft: (field: keyof SetDraft, delta: number) => void;
  readonly setDraftValue: (field: keyof SetDraft, value: number) => void;
  /** Tap a chip: logged → edit it; current → back to logging. */
  readonly selectSet: (n: number) => void;
  readonly togglePause: () => void;
  /** Elapsed active seconds (excludes pause time). */
  readonly elapsedSec: () => number;
  readonly skipExercise: () => void;
  readonly swapExercise: () => void;
  readonly setRpe: (rpe: number) => void;
  readonly finish: () => Promise<void>;
  readonly reset: () => void;
};

const empty = {
  sessionId: null as string | null,
  sessionSource: "none" as SessionSource,
  workoutTitle: "No workout",
  exercises: [] as PlanExercise[],
  exerciseIndex: 0,
  setIndex: 1,
  sets: [] as SetSlot[],
  draft: { weightKg: 0, reps: DEFAULT_REPS } as SetDraft,
  editingSet: null as number | null,
  paused: false,
  startedAt: null as number | null,
  pausedTotalMs: 0,
  pauseStartedAt: null as number | null,
  kcal: 0,
  rpe: null as number | null,
  finished: false,
  durationMin: 0,
};

export const useWorkoutStore = create<WorkoutState>((set, get) => {
  /** Prefill: plan target → last logged set (SQLite) → 0 kg × plan reps; only if untouched. */
  const hydrateDraft = async (ex: PlanExercise): Promise<void> => {
    if (ex.targetLoadKg != null) return;
    const before = get().draft;
    try {
      const last = await getLastSetForExercise(ex.id, ex.name);
      const s = get();
      const stillHere = s.exercises[s.exerciseIndex]?.id === ex.id;
      const untouched = s.draft === before && !s.sets.some((x) => x.done);
      if (!last || !stillHere || !untouched) return;
      set({
        draft: {
          weightKg: last.weightKg ?? before.weightKg,
          reps: last.reps ?? before.reps,
        },
      });
    } catch (err) {
      logger.warn("workout.prefill.failed", { message: errorMessage(err) });
    }
  };

  const enterExercise = (ex: PlanExercise, exerciseIndex: number) => {
    queueMicrotask(() => void hydrateDraft(ex));
    return {
      exerciseIndex,
      setIndex: 1,
      sets: buildSets(ex),
      draft: planDraft(ex),
      editingSet: null,
    };
  };

  return {
    ...empty,

    start: async (workout, focusExerciseId) => {
      if (!workout || workout.exercises.length === 0) {
        set({
          ...empty,
          workoutTitle: workout?.title ?? "No workout loaded",
          startedAt: Date.now(),
        });
        return;
      }
      const focusIdx = Math.max(
        0,
        workout.exercises.findIndex((e) => e.id === focusExerciseId),
      );
      const first = workout.exercises[focusIdx]!;
      let sessionId: string | null = null;
      let sessionSource: SessionSource = "none";
      try {
        const sess = await apiStartSession({ workoutId: workout.id });
        sessionId = sess.id;
        sessionSource = "api";
      } catch (err) {
        logger.warn("workout.start.api_failed_using_local", {
          message: errorMessage(err),
        });
        try {
          const sess = await dbStartSession({ workoutId: workout.id });
          sessionId = sess.id;
          sessionSource = "local";
        } catch (localErr) {
          logger.error("workout.start.local_failed", {
            message: errorMessage(localErr),
          });
        }
      }
      set({
        sessionId,
        sessionSource,
        workoutTitle: workout.title,
        exercises: [...workout.exercises],
        ...enterExercise(first, focusIdx),
        paused: false,
        startedAt: Date.now(),
        pausedTotalMs: 0,
        pauseStartedAt: null,
        kcal: 0,
        rpe: null,
        finished: false,
        durationMin: workout.durationMin,
      });
    },

    openExercise: async (workout, exerciseId) => {
      const { sessionId, finished, exercises, exerciseIndex } = get();
      const idx = exercises.findIndex((e) => e.id === exerciseId);
      if (!sessionId || finished || idx < 0) return get().start(workout, exerciseId);
      if (idx !== exerciseIndex) set(enterExercise(exercises[idx]!, idx));
    },

    elapsedSec: () => {
      const { startedAt, pausedTotalMs, pauseStartedAt } = get();
      if (!startedAt) return 0;
      const now = Date.now();
      const currentPause = pauseStartedAt ? now - pauseStartedAt : 0;
      return Math.max(
        0,
        Math.floor((now - startedAt - pausedTotalMs - currentPause) / 1000),
      );
    },

    adjustDraft: (field, delta) =>
      set((s) => ({
        draft: { ...s.draft, [field]: clampValue(field, s.draft[field] + delta) },
      })),

    setDraftValue: (field, value) =>
      set((s) => ({ draft: { ...s.draft, [field]: clampValue(field, value) } })),

    selectSet: (n) => {
      const { sets, setIndex } = get();
      const slot = sets.find((x) => x.n === n);
      if (!slot) return;
      if (slot.done) {
        set({
          editingSet: n,
          draft: { weightKg: slot.weightKg ?? 0, reps: slot.reps ?? DEFAULT_REPS },
        });
        return;
      }
      if (n === setIndex) set({ editingSet: null });
    },

    logSet: async () => {
      const { sets, setIndex, exerciseIndex, exercises, kcal, sessionId, draft, editingSet } =
        get();
      const ex = exercises[exerciseIndex];
      if (!ex) return;
      const n = editingSet ?? setIndex;

      if (sessionId) {
        await persistSet(get().sessionSource, sessionId, {
          exerciseId: ex.id,
          exerciseName: ex.name,
          setIndex: n,
          weightKg: draft.weightKg,
          reps: draft.reps,
          completed: true,
        });
      }

      const nextSets = sets.map((s) =>
        s.n === n ? { ...s, done: true, weightKg: draft.weightKg, reps: draft.reps } : s,
      );
      // Correcting an earlier set: save it, keep the current position.
      if (editingSet !== null) {
        set({ sets: nextSets, editingSet: null });
        return;
      }
      const nextKcal = kcal + 42;
      if (!nextSets.every((s) => s.done)) {
        set({ sets: nextSets, setIndex: setIndex + 1, kcal: nextKcal });
        return;
      }
      const nextEx = exerciseIndex + 1;
      if (nextEx >= exercises.length) {
        set({ sets: nextSets, kcal: nextKcal, finished: true });
        await get().finish();
        return;
      }
      set({ ...enterExercise(exercises[nextEx]!, nextEx), kcal: nextKcal });
    },

    togglePause: () =>
      set((s) => {
        if (!s.paused) {
          return { paused: true, pauseStartedAt: Date.now() };
        }
        const add = s.pauseStartedAt ? Date.now() - s.pauseStartedAt : 0;
        return {
          paused: false,
          pauseStartedAt: null,
          pausedTotalMs: s.pausedTotalMs + add,
        };
      }),

    skipExercise: () => {
      const { exerciseIndex, exercises } = get();
      const nextEx = exerciseIndex + 1;
      if (nextEx >= exercises.length) {
        set({ finished: true });
        void get().finish();
        return;
      }
      set(enterExercise(exercises[nextEx]!, nextEx));
    },

    swapExercise: () => {
      const { exerciseIndex, exercises } = get();
      if (exercises.length < 2) return;
      const nextEx = (exerciseIndex + 1) % exercises.length;
      set(enterExercise(exercises[nextEx]!, nextEx));
    },

    setRpe: (rpe) => set({ rpe }),

    finish: async () => {
      const { sessionId, rpe } = get();
      const durationMin = Math.max(1, Math.round(get().elapsedSec() / 60));
      set({ finished: true, durationMin });
      if (sessionId) {
        await persistComplete(get().sessionSource, sessionId, rpe);
      }
    },

    reset: () => set({ ...empty }),
  };
});
