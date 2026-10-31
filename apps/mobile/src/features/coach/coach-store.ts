import { create } from "zustand";

import { copy } from "@/content/copy";
import { listCheckIns, submitCheckIn } from "@/db";
import { useFuelStore } from "@/features/fuel/fuel-store";
import { useTodayStore } from "@/features/today/today-store";
import {
  applyRebuild,
  createCheckIn,
  previewRebuild,
  type CheckInStatus,
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
  readonly submitCheckIn: () => Promise<"rebuild" | "done" | "failed">;
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

  submitCheckIn: async () => {
    const { readiness, vectorId, fetchAdvise } = get();
    // Map coach UI → API CheckInStatusSchema (done|partial|skipped|soreness|low_sleep|travel).
    const status: CheckInStatus =
      readiness === "rest"
        ? "skipped"
        : vectorId === "missed"
          ? "partial"
          : vectorId === "deload"
            ? "low_sleep"
            : vectorId === "express"
              ? "travel"
              : "done";
    const localDate = todayIso();
    let checkInId: string | null = null;
    let coachMessage: string | undefined;

    try {
      const row = await submitCheckIn({
        localDate,
        status,
        note: `vector:${vectorId}`,
        triggeredRebuild: status === "skipped",
      });
      checkInId = row.id;
    } catch (err) {
      logger.warn("coach.checkin.local.failed", { message: errorMessage(err) });
      checkInId = `local_${Date.now()}`;
    }

    let remoteOk = false;
    try {
      const remote = await createCheckIn({
        localDate,
        status,
        note: `vector:${vectorId}`,
      });
      checkInId = remote.id;
      coachMessage = remote.coachMessage;
      remoteOk = true;
      logger.info("coach.checkin.remote.ok", { id: remote.id, status });
    } catch (err) {
      logger.error("coach.checkin.remote.failed", {
        message: errorMessage(err),
        status: err instanceof MirraApiError ? err.status : undefined,
        code: err instanceof MirraApiError ? err.code : undefined,
      });
    }

    if (!remoteOk) {
      // Never claim "saved": the server (source of truth for Today) did not get it.
      set({
        lastCheckInId: null,
        notice: "Check-in failed to sync — not saved. Check your connection and try again.",
      });
      return "failed";
    } else {
      set({
        lastCheckInId: checkInId,
        checkedInDate: localDate,
        notice: "Check-in saved — Today updated",
        ...(coachMessage ? { adviseMessage: coachMessage } : {}),
      });
      // Optimistic: hide Today "Check-in" chip before hydrate round-trip.
      useTodayStore.setState({ checkInDue: false });
      await get().hydrate();
      if (!coachMessage) await fetchAdvise();
      await Promise.all([
        useTodayStore.getState().hydrate(),
        useFuelStore.getState().hydrate(),
      ]).catch(() => undefined);
      if (status !== "skipped") return "done";
    }

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
      logger.info("coach.rebuild.preview.ok", {
        hasToken: Boolean(preview.previewToken),
      });
    } catch (err) {
      logger.error("coach.rebuild.preview.failed", {
        message: errorMessage(err),
        status: err instanceof MirraApiError ? err.status : undefined,
      });
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
        logger.info("coach.rebuild.apply.ok", { planId: plan.id });
      }
      set({ notice: "New plan applied", previewToken: null });
    } catch (err) {
      logger.error("coach.rebuild.apply.failed", {
        message: errorMessage(err),
        status: err instanceof MirraApiError ? err.status : undefined,
      });
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
