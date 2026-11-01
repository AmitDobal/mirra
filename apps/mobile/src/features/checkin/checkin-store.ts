import { create } from "zustand";

import { useTodayStore } from "@/features/today/today-store";

import { useTodayAdjustStore } from "./adjust-store";
import {
  buildDiff,
  buildNote,
  suggestMode,
  toApiStatus,
  type AdjustMode,
  type BodyArea,
  type CheckInInputs,
  type Energy,
  type Sleep,
  type Soreness,
  type WorkoutDiff,
} from "./checkin-logic";
import { persistCheckIn, SYNC_FAILED_NOTICE, todayIso } from "./persist-check-in";

export type CheckInPhase = "input" | "result";

export type CheckInResult = {
  readonly inputs: CheckInInputs;
  readonly suggested: AdjustMode;
  readonly mode: AdjustMode;
  readonly diff: WorkoutDiff | null;
};

type State = CheckInInputs & {
  readonly note: string;
  readonly photoUri: string | null;
  readonly phase: CheckInPhase;
  readonly busy: boolean;
  readonly error: string | null;
  readonly result: CheckInResult | null;
  readonly setEnergy: (energy: Energy) => void;
  readonly setSleep: (sleep: Sleep) => void;
  readonly setSoreness: (soreness: Soreness) => void;
  readonly toggleArea: (area: BodyArea) => void;
  readonly setNote: (note: string) => void;
  readonly setPhotoUri: (uri: string | null) => void;
  /** "Update my day" — save the taps, then show the AI proposal. */
  readonly submit: () => Promise<boolean>;
  /** "Skip — rest counts" — records a rest day without changing the plan. */
  readonly skip: () => Promise<boolean>;
  /** Tap a proposal pill: re-apply the chosen mode to today. */
  readonly chooseMode: (mode: AdjustMode) => void;
  /** "Keep original plan" — drop any adjustment. */
  readonly keepOriginal: () => void;
  /** Back to a fresh input form (call when leaving the flow). */
  readonly reset: () => void;
};

const INITIAL = {
  energy: 3 as Energy,
  sleep: "ok" as Sleep,
  soreness: "none" as Soreness,
  areas: [] as readonly BodyArea[],
  note: "",
  photoUri: null,
  phase: "input" as CheckInPhase,
  busy: false,
  error: null,
  result: null,
};

/** Mirror a mode onto the Today overlay (keep → clear). */
const applyMode = (mode: AdjustMode, diff: WorkoutDiff | null): void => {
  const overlay = useTodayAdjustStore.getState();
  if (mode === "keep" || !diff) {
    overlay.set(null);
    return;
  }
  overlay.set({ date: todayIso(), mode, beforeMin: diff.beforeMin, afterMin: diff.afterMin });
};

export const useCheckInStore = create<State>((set, get) => ({
  ...INITIAL,

  setEnergy: (energy) => set({ energy }),
  setSleep: (sleep) => set({ sleep }),
  setSoreness: (soreness) => set({ soreness, ...(soreness === "none" ? { areas: [] } : {}) }),
  toggleArea: (area) =>
    set((s) => ({
      areas: s.areas.includes(area) ? s.areas.filter((a) => a !== area) : [...s.areas, area],
    })),
  setNote: (note) => set({ note }),
  setPhotoUri: (photoUri) => set({ photoUri }),

  submit: async () => {
    const s = get();
    if (s.busy) return false;
    set({ busy: true, error: null });
    const inputs: CheckInInputs = {
      energy: s.energy,
      sleep: s.sleep,
      soreness: s.soreness,
      areas: s.soreness === "none" ? [] : s.areas,
    };
    const ok = await persistCheckIn(toApiStatus(inputs), buildNote(inputs, s.note, s.photoUri != null));
    if (!ok) {
      set({ busy: false, error: SYNC_FAILED_NOTICE });
      return false;
    }
    const workout = useTodayStore.getState().workout;
    // Rest day: nothing to trim, so the proposal is always "keep".
    const suggested = workout ? suggestMode(inputs) : "keep";
    const diff = buildDiff(workout, suggested);
    applyMode(suggested, diff);
    set({
      busy: false,
      phase: "result",
      result: { inputs, suggested, mode: suggested, diff },
    });
    return true;
  },

  skip: async () => {
    if (get().busy) return false;
    set({ busy: true, error: null });
    const ok = await persistCheckIn("skipped", "Rest day · Rest counts");
    set({ busy: false, error: ok ? null : SYNC_FAILED_NOTICE });
    if (ok) applyMode("keep", null);
    return ok;
  },

  chooseMode: (mode) => {
    const { result } = get();
    if (!result || result.mode === mode) return;
    const diff = buildDiff(useTodayStore.getState().workout, mode);
    applyMode(mode, diff);
    set({ result: { ...result, mode, diff } });
  },

  keepOriginal: () => applyMode("keep", null),

  reset: () => set({ ...INITIAL }),
}));
