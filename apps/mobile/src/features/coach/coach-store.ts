import { create } from "zustand";

import { listCheckIns, submitCheckIn } from "@/db";
import {
  applyRebuild,
  createCheckIn,
  previewRebuild,
  type CheckInStatus,
  type CurrentPlan,
} from "@/lib/api";
import { usePlanStore } from "@/stores/plan-store";

type CoachState = {
  readonly readiness: "push" | "rest";
  readonly vectorId: string;
  readonly lastCheckInId: string | null;
  readonly previewToken: string | null;
  readonly previewAfter: CurrentPlan | null;
  readonly weekLogged: number;
  readonly notice: string | null;
  readonly setReadiness: (readiness: "push" | "rest") => void;
  readonly setVectorId: (vectorId: string) => void;
  readonly hydrate: () => Promise<void>;
  readonly submitCheckIn: () => Promise<"rebuild" | "done">;
  readonly apply: () => Promise<void>;
  readonly keep: () => Promise<void>;
  readonly clearNotice: () => void;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export const useCoachStore = create<CoachState>((set, get) => ({
  readiness: "push",
  vectorId: "missed",
  lastCheckInId: null,
  previewToken: null,
  previewAfter: null,
  weekLogged: 0,
  notice: null,

  setReadiness: (readiness) => set({ readiness }),
  setVectorId: (vectorId) => set({ vectorId }),
  clearNotice: () => set({ notice: null }),

  hydrate: async () => {
    try {
      const rows = await listCheckIns("local", 14);
      const done = rows.filter((r) =>
        ["done", "on_track", "modified", "partial"].includes(r.status),
      ).length;
      set({ weekLogged: done });
    } catch {
      /* keep prior */
    }
  },

  submitCheckIn: async () => {
    const { readiness, vectorId } = get();
    const status: CheckInStatus =
      readiness === "rest" ? "skipped" : vectorId === "missed" ? "on_track" : "modified";
    const localDate = todayIso();
    let checkInId: string | null = null;

    try {
      const row = await submitCheckIn({
        localDate,
        status,
        note: `vector:${vectorId}`,
        triggeredRebuild: status === "skipped",
      });
      checkInId = row.id;
    } catch {
      checkInId = `local_${Date.now()}`;
    }

    try {
      const remote = await createCheckIn({
        localDate,
        status,
        note: `vector:${vectorId}`,
      });
      checkInId = remote.id;
    } catch {
      /* sqlite already saved */
    }

    set({ lastCheckInId: checkInId, notice: `Check-in saved (${status})` });
    if (status !== "skipped") return "done";

    try {
      const preview = await previewRebuild({
        checkInId: checkInId ?? undefined,
        reason: "skipped_session",
      });
      set({
        previewToken: preview.previewToken ?? "local_preview",
        previewAfter: preview.after,
      });
      if (preview.after) usePlanStore.getState().setPlan(preview.after);
    } catch {
      set({ previewToken: "local_preview", previewAfter: null });
    }
    return "rebuild";
  },

  apply: async () => {
    const { previewToken } = get();
    try {
      if (previewToken && previewToken !== "local_preview") {
        const plan = await applyRebuild({ previewToken }, `apply_${Date.now()}`);
        usePlanStore.getState().setPlan(plan);
      }
      set({ notice: "New plan applied", previewToken: null });
    } catch {
      set({ notice: "Applied locally", previewToken: null });
    }
  },

  keep: async () => {
    set({
      notice: "Kept original schedule",
      previewToken: null,
      previewAfter: null,
    });
  },
}));
