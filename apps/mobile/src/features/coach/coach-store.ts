import { create } from "zustand";

import { copy } from "@/content/copy";
import { listCheckIns } from "@/db";
import {
  applyRebuild,
  previewRebuild,
  type CoachPill,
  type CoachVector,
  type CurrentPlan,
} from "@/lib/api";
import { MirraApiError } from "@/lib/api/client";
import { errorMessage, logger } from "@/lib/logger";
import { usePlanStore } from "@/stores/plan-store";

import { FALLBACK_VECTORS, runAdvise } from "./advise-fetch";

export { FALLBACK_VECTORS };

type CoachState = {
  readonly readiness: "push" | "rest";
  readonly vectorId: string;
  readonly lastCheckInId: string | null;
  readonly previewToken: string | null;
  readonly previewAfter: CurrentPlan | null;
  /** Plan the preview was computed against (S21 "Original Schedule"). */
  readonly previewBefore: CurrentPlan | null;
  readonly previewLoading: boolean;
  readonly previewError: string | null;
  readonly weekLogged: number;
  readonly notice: string | null;
  readonly adviseMessage: string;
  readonly advisePills: readonly CoachPill[];
  readonly vectors: readonly CoachVector[];
  readonly adviseLoading: boolean;
  /** Epoch ms of the network fetch behind the current advise (null = fallback copy). */
  readonly adviseCachedAt: number | null;
  /** True when the last forced refresh was blocked by the 60s throttle. */
  readonly adviseThrottled: boolean;
  /** ISO date of last successful check-in this session (Today chip + CTA). */
  readonly checkedInDate: string | null;
  readonly setReadiness: (readiness: "push" | "rest") => void;
  readonly setVectorId: (vectorId: string) => void;
  readonly hydrate: () => Promise<void>;
  /** Cache-first advise (15 min TTL per date/readiness/vector). */
  readonly fetchAdvise: () => Promise<void>;
  /** Corner-refresh: bypass TTL, throttled to once per 60s per key. */
  readonly forceRefreshAdvise: () => Promise<void>;
  /** POST /v1/plans/rebuild/preview for the selected vector; stores token + before/after. */
  readonly preview: () => Promise<void>;
  /** Commits the previewed plan. Resolves true when the server applied it. */
  readonly apply: () => Promise<boolean>;
  readonly keep: () => Promise<void>;
  readonly clearNotice: () => void;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Ignore a preview response that lands after Keep / a newer preview. */
let previewSeq = 0;

const CLEARED_PREVIEW = {
  previewToken: null,
  previewAfter: null,
  previewBefore: null,
  previewLoading: false,
  previewError: null,
} as const;

/** Rebuild reason sent to the API; "missed" wording makes the server shift train days. */
export const rebuildReason = (vectorId: string): string => {
  if (vectorId === "deload") return "Deload: low readiness, protect recovery";
  if (vectorId === "express") return "Express: compress sessions to 20 minutes";
  return "Missed session: shift the remaining lifts";
};

export const useCoachStore = create<CoachState>((set, get) => ({
  readiness: "push",
  vectorId: "missed",
  lastCheckInId: null,
  previewToken: null,
  previewAfter: null,
  previewBefore: null,
  previewLoading: false,
  previewError: null,
  weekLogged: 0,
  notice: null,
  adviseMessage: copy.coach.fallbackMessage,
  advisePills: [],
  vectors: FALLBACK_VECTORS,
  adviseLoading: false,
  adviseCachedAt: null,
  adviseThrottled: false,
  checkedInDate: null,

  setReadiness: (readiness) => set({ readiness }),
  setVectorId: (vectorId) => set({ vectorId }),
  clearNotice: () => set({ notice: null }),

  hydrate: async () => {
    try {
      const rows = await listCheckIns(undefined, 14);
      const today = todayIso();
      const done = rows.filter((r) =>
        ["done", "on_track", "modified", "partial", "skipped", "low_sleep", "travel", "soreness"].includes(
          r.status,
        ),
      ).length;
      const todayRow = rows.find((r) => r.localDate === today);
      set({
        weekLogged: done,
        checkedInDate: todayRow ? today : get().checkedInDate,
      });
    } catch {
      /* keep prior */
    }
  },

  fetchAdvise: () => runAdvise(get, set, false),
  forceRefreshAdvise: () => runAdvise(get, set, true),

  preview: async () => {
    const seq = ++previewSeq;
    set({ ...CLEARED_PREVIEW, previewLoading: true, notice: null });
    try {
      const res = await previewRebuild({
        reason: rebuildReason(get().vectorId),
        ...(get().lastCheckInId ? { checkInId: get().lastCheckInId! } : {}),
      });
      if (seq !== previewSeq) return;
      set({
        previewLoading: false,
        previewToken: res.previewToken ?? null,
        previewAfter: res.after,
        previewBefore: res.before ?? usePlanStore.getState().plan,
        previewError: res.previewToken ? null : copy.coach.rebuildPreviewFailed,
      });
      logger.info("coach.rebuild.preview.ok", { diffs: res.diffs.length });
    } catch (err) {
      if (seq !== previewSeq) return;
      logger.error("coach.rebuild.preview.failed", {
        message: errorMessage(err),
        status: err instanceof MirraApiError ? err.status : undefined,
      });
      set({ previewLoading: false, previewError: copy.coach.rebuildPreviewFailed });
    }
  },

  apply: async () => {
    const { previewToken } = get();
    if (!previewToken) return false;
    try {
      const plan = await applyRebuild({ previewToken }, `apply_${previewToken}`);
      usePlanStore.getState().setPlan(plan);
      logger.info("coach.rebuild.apply.ok", { planId: plan.id, version: plan.version });
      set({ ...CLEARED_PREVIEW, notice: copy.coach.rebuildApplied });
      return true;
    } catch (err) {
      logger.error("coach.rebuild.apply.failed", {
        message: errorMessage(err),
        status: err instanceof MirraApiError ? err.status : undefined,
      });
      set({ previewError: copy.coach.rebuildApplyFailed });
      return false;
    }
  },

  keep: async () => {
    previewSeq += 1;
    set({ ...CLEARED_PREVIEW, notice: "Kept original schedule" });
  },
}));
