import { create } from "zustand";

import { copy } from "@/content/copy";
import { listCheckIns, submitCheckIn } from "@/db";
import { useFuelStore } from "@/features/fuel/fuel-store";
import { useTodayStore } from "@/features/today/today-store";
import {
  applyRebuild,
  createCheckIn,
  postCoachAdvise,
  previewRebuild,
  type CheckInStatus,
  type CoachVector,
  type CurrentPlan,
} from "@/lib/api";
import { usePlanStore } from "@/stores/plan-store";

export const FALLBACK_VECTORS: readonly CoachVector[] = [
  {
    id: "missed",
    title: "Missed Session Recalibration",
    recommended: true,
    detail: "Redistribute missed volume across remaining microcycle days.",
  },
  {
    id: "deload",
    title: "Deload / Low Readiness",
    recommended: false,
    detail: "Drop load and swap high-strain compounds for active flow.",
  },
  {
    id: "express",
    title: "20-Min Express Compression",
    recommended: false,
    detail: "High-density supersets preserving top compound mechanics.",
  },
];

type CoachState = {
  readonly readiness: "push" | "rest";
  readonly vectorId: string;
  readonly lastCheckInId: string | null;
  readonly previewToken: string | null;
  readonly previewAfter: CurrentPlan | null;
  readonly weekLogged: number;
  readonly notice: string | null;
  readonly adviseMessage: string;
  readonly vectors: readonly CoachVector[];
  readonly adviseLoading: boolean;
  readonly setReadiness: (readiness: "push" | "rest") => void;
  readonly setVectorId: (vectorId: string) => void;
  readonly hydrate: () => Promise<void>;
  readonly fetchAdvise: () => Promise<void>;
  readonly submitCheckIn: () => Promise<"rebuild" | "done">;
  readonly apply: () => Promise<void>;
  readonly keep: () => Promise<void>;
  readonly clearNotice: () => void;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const fallbackFor = (readiness: "push" | "rest") =>
  readiness === "rest" ? copy.coach.fallbackRest : copy.coach.fallbackMessage;

export const useCoachStore = create<CoachState>((set, get) => ({
  readiness: "push",
  vectorId: "missed",
  lastCheckInId: null,
  previewToken: null,
  previewAfter: null,
  weekLogged: 0,
  notice: null,
  adviseMessage: copy.coach.fallbackMessage,
  vectors: FALLBACK_VECTORS,
  adviseLoading: false,

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

  fetchAdvise: async () => {
    const { readiness, vectorId } = get();
    set({ adviseLoading: true });
    try {
      const res = await postCoachAdvise({
        readiness,
        vectorId,
        localDate: todayIso(),
      });
      const message = res.coachMessage ?? res.message;
      const vectors =
        res.vectors && res.vectors.length > 0 ? res.vectors : FALLBACK_VECTORS;
      const nextId = vectors.some((v) => v.id === vectorId)
        ? vectorId
        : (vectors.find((v) => v.recommended)?.id ?? vectors[0]?.id ?? vectorId);
      set({
        adviseMessage: message || fallbackFor(readiness),
        vectors,
        vectorId: nextId,
        adviseLoading: false,
      });
    } catch {
      set({
        adviseMessage: fallbackFor(readiness),
        vectors: FALLBACK_VECTORS,
        adviseLoading: false,
      });
    }
  },

  submitCheckIn: async () => {
    const { readiness, vectorId, fetchAdvise } = get();
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
    await fetchAdvise();
    await Promise.all([
      useTodayStore.getState().hydrate(),
      useFuelStore.getState().hydrate(),
    ]).catch(() => undefined);
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
