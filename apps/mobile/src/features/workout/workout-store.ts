import { create } from "zustand";

import {
  completeSession,
  logSet as dbLogSet,
  startSession,
} from "@/db";
import type { PlanExercise, PlanWorkout } from "@/lib/api";

export type SetSlot = {
  readonly n: number;
  readonly load: string;
  readonly done: boolean;
};

type WorkoutState = {
  readonly sessionId: string | null;
  readonly workoutTitle: string;
  readonly exercises: readonly PlanExercise[];
  readonly exerciseIndex: number;
  readonly setIndex: number;
  readonly sets: readonly SetSlot[];
  readonly paused: boolean;
  readonly startedAt: number | null;
  readonly kcal: number;
  readonly rpe: number | null;
  readonly finished: boolean;
  readonly durationMin: number;
  readonly start: (workout: PlanWorkout | null) => Promise<void>;
  readonly logSet: () => Promise<void>;
  readonly togglePause: () => void;
  readonly skipExercise: () => void;
  readonly swapExercise: () => void;
  readonly setRpe: (rpe: number) => void;
  readonly finish: () => Promise<void>;
  readonly reset: () => void;
};

const buildSets = (ex: PlanExercise): SetSlot[] =>
  Array.from({ length: Math.max(1, ex.targetSets) }, (_, i) => ({
    n: i + 1,
    load: `${ex.targetReps} reps`,
    done: false,
  }));

const empty = {
  sessionId: null as string | null,
  workoutTitle: "No workout",
  exercises: [] as PlanExercise[],
  exerciseIndex: 0,
  setIndex: 1,
  sets: [] as SetSlot[],
  paused: false,
  startedAt: null as number | null,
  kcal: 0,
  rpe: null as number | null,
  finished: false,
  durationMin: 0,
};

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  ...empty,

  start: async (workout) => {
    if (!workout || workout.exercises.length === 0) {
      set({
        ...empty,
        workoutTitle: workout?.title ?? "No workout loaded",
        startedAt: Date.now(),
      });
      return;
    }
    const first = workout.exercises[0]!;
    let sessionId: string | null = null;
    try {
      const sess = await startSession({ workoutId: workout.id });
      sessionId = sess.id;
    } catch {
      sessionId = `local_${Date.now()}`;
    }
    set({
      sessionId,
      workoutTitle: workout.title,
      exercises: [...workout.exercises],
      exerciseIndex: 0,
      setIndex: 1,
      sets: buildSets(first),
      paused: false,
      startedAt: Date.now(),
      kcal: 0,
      rpe: null,
      finished: false,
      durationMin: workout.durationMin,
    });
  },

  logSet: async () => {
    const {
      sets,
      setIndex,
      exerciseIndex,
      exercises,
      kcal,
      sessionId,
    } = get();
    const ex = exercises[exerciseIndex];
    if (!ex) return;

    if (sessionId && !sessionId.startsWith("local_")) {
      try {
        await dbLogSet({
          sessionId,
          exerciseId: ex.id,
          exerciseName: ex.name,
          setIndex: setIndex - 1,
          reps: Number.parseInt(String(ex.targetReps), 10) || null,
          completed: true,
        });
      } catch {
        /* continue UI */
      }
    }

    const nextSets = sets.map((s) => (s.n === setIndex ? { ...s, done: true } : s));
    const allDone = nextSets.every((s) => s.done);
    if (!allDone) {
      set({ sets: nextSets, setIndex: setIndex + 1, kcal: kcal + 42 });
      return;
    }
    const nextEx = exerciseIndex + 1;
    if (nextEx >= exercises.length) {
      set({ sets: nextSets, kcal: kcal + 42, finished: true });
      await get().finish();
      return;
    }
    const next = exercises[nextEx]!;
    set({
      sets: buildSets(next),
      exerciseIndex: nextEx,
      setIndex: 1,
      kcal: kcal + 42,
    });
  },

  togglePause: () => set((s) => ({ paused: !s.paused })),

  skipExercise: () => {
    const { exerciseIndex, exercises } = get();
    const nextEx = exerciseIndex + 1;
    if (nextEx >= exercises.length) {
      set({ finished: true });
      void get().finish();
      return;
    }
    const ex = exercises[nextEx]!;
    set({ exerciseIndex: nextEx, setIndex: 1, sets: buildSets(ex) });
  },

  swapExercise: () => {
    const { exerciseIndex, exercises } = get();
    if (exercises.length < 2) return;
    const nextEx = (exerciseIndex + 1) % exercises.length;
    const ex = exercises[nextEx]!;
    set({ exerciseIndex: nextEx, setIndex: 1, sets: buildSets(ex) });
  },

  setRpe: (rpe) => set({ rpe }),

  finish: async () => {
    const { sessionId, rpe, startedAt } = get();
    const durationMin = startedAt
      ? Math.max(1, Math.round((Date.now() - startedAt) / 60_000))
      : get().durationMin;
    set({ finished: true, durationMin });
    if (sessionId && !sessionId.startsWith("local_")) {
      try {
        await completeSession({ sessionId, rpe });
      } catch {
        /* ignore */
      }
    }
  },

  reset: () => set({ ...empty }),
}));
