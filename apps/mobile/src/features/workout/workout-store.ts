import { create } from "zustand";

import type { PlanExercise, PlanWorkout } from "@/lib/api";
import type { ApiTierChange } from "@/lib/api/strength-exercise";
import { errorMessage, logger } from "@/lib/logger";
import { markWorkoutOpen } from "./use-open-timing";

import {
  activeSeconds,
  DEFAULT_REPS,
  buildSets,
  clampValue,
  openSession,
  persistComplete,
  persistRpe,
  persistSet,
  planDraft,
  prefillDraft,
  type SessionSource,
  type SetDraft,
  type SetSlot,
} from "./workout-persist";
import { createSessionLine } from "./session-line";
import { createFinisher } from "./workout-finish";
import { loggedKey, type LoggedSets } from "./workout-volume";

export type { SessionSource, SetDraft, SetSlot } from "./workout-persist";

type WorkoutState = {
  readonly sessionId: string | null;
  /** "pending" while the session row opens in the background (HUD is already live). */
  readonly sessionSource: SessionSource | "pending";
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
  /** Tier promotions from the complete response (S38); empty = plain S17. */
  readonly tierChanges: readonly ApiTierChange[];
  /** Every set logged this session (kg × reps), for the S17 volume. */
  readonly logged: LoggedSets;
  /** Sync: the HUD can render (and navigate) at once; the session opens in the background. */
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
  /** S17 Done: finish in the background, then reset unless a new workout started. */
  readonly close: () => void;
  readonly reset: () => void;
};

const empty = {
  sessionId: null as string | null,
  sessionSource: "none" as SessionSource | "pending",
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
  tierChanges: [] as readonly ApiTierChange[],
  logged: {} as LoggedSets,
};

/** Let S17 slide away before its data clears. */
const CLOSE_RESET_DELAY_MS = 600;

export const useWorkoutStore = create<WorkoutState>((set, get) => {
  const line = createSessionLine<SessionSource>(
    (opened) => set(opened),
    (err) => logger.warn("workout.session_line.failed", { message: errorMessage(err) }),
  );
  /** Line generation whose finish already stamped `finished` + duration. */
  let finalizedGen = -1;
  const source = (): SessionSource => {
    const src = get().sessionSource;
    return src === "pending" ? "none" : src;
  };
  const finisher = createFinisher<ApiTierChange>(
    {
      // Logged sets reach the server before the complete scores them.
      complete: (id, rpe) => line.drained().then(() => persistComplete(source(), id, rpe)),
      saveRpe: (id, rpe) => persistRpe(source(), id, rpe),
    },
    {
      sessionId: () => get().sessionId,
      rpe: () => get().rpe,
      onTierChanges: (id, changes) => {
        if (get().sessionId === id) set({ tierChanges: changes });
      },
    },
  );
  const enterExercise = (ex: PlanExercise, exerciseIndex: number) => {
    queueMicrotask(() => void prefillDraft(ex, get, (draft) => set({ draft })));
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
      markWorkoutOpen();
      if (!workout || workout.exercises.length === 0) {
        line.cancel();
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
      set({
        ...empty,
        sessionSource: "pending",
        workoutTitle: workout.title,
        exercises: [...workout.exercises],
        ...enterExercise(first, focusIdx),
        startedAt: Date.now(),
        durationMin: workout.durationMin,
      });
      // Not awaited: callers navigate now; sets queue behind the open (session-line).
      void line.begin(() => openSession(workout.id));
    },

    openExercise: async (workout, exerciseId) => {
      const { sessionId, sessionSource, finished, exercises, exerciseIndex } = get();
      const idx = exercises.findIndex((e) => e.id === exerciseId);
      const live = Boolean(sessionId) || sessionSource === "pending";
      if (!live || finished || idx < 0) return get().start(workout, exerciseId);
      if (idx !== exerciseIndex) set(enterExercise(exercises[idx]!, idx));
    },

    elapsedSec: () => {
      const { startedAt, pausedTotalMs, pauseStartedAt } = get();
      return activeSeconds(startedAt, pausedTotalMs, pauseStartedAt);
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
      const { sets, setIndex, exerciseIndex, exercises, kcal, draft, editingSet } = get();
      const ex = exercises[exerciseIndex];
      if (!ex) return;
      const n = editingSet ?? setIndex;
      // Optimistic: the chip flips now; the write queues behind the session open.
      const body = { exerciseId: ex.id, exerciseName: ex.name, setIndex: n, ...draft, completed: true };
      void line.enqueue((s) => persistSet(s.sessionSource, s.sessionId, body));

      const nextSets = sets.map((s) =>
        s.n === n ? { ...s, done: true, weightKg: draft.weightKg, reps: draft.reps } : s,
      );
      set((s) => ({ logged: { ...s.logged, [loggedKey(ex.id, n)]: { ...draft } } }));
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
        set({ sets: nextSets, kcal: nextKcal });
        await get().finish(); // stamps `finished` → HUD leaves for S17
        return;
      }
      set({ ...enterExercise(exercises[nextEx]!, nextEx), kcal: nextKcal });
    },

    togglePause: () =>
      set((s) => {
        if (!s.paused) return { paused: true, pauseStartedAt: Date.now() };
        const add = s.pauseStartedAt ? Date.now() - s.pauseStartedAt : 0;
        return { paused: false, pauseStartedAt: null, pausedTotalMs: s.pausedTotalMs + add };
      }),

    skipExercise: () => {
      const { exerciseIndex, exercises } = get();
      const nextEx = exerciseIndex + 1;
      if (nextEx >= exercises.length) {
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
      // HUD Finish completes; S17 Done only saves a changed RPE (no second complete).
      // Stamped synchronously so the HUD can leave for S17 before the network returns.
      if (finalizedGen !== line.generation()) {
        finalizedGen = line.generation();
        set({ finished: true, durationMin: Math.max(1, Math.round(get().elapsedSec() / 60)) });
      }
      await line.ready();
      return finisher.finish();
    },

    close: () => {
      const gen = line.generation();
      void get()
        .finish()
        .finally(() => {
          setTimeout(() => {
            if (line.generation() === gen) get().reset();
          }, CLOSE_RESET_DELAY_MS);
        });
    },

    reset: () => {
      line.cancel();
      set({ ...empty });
    },
  };
});
