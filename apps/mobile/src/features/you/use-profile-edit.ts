import { useCallback, useState } from "react";

import { patchLocalProfile } from "@/db";
import { useWeightStore } from "@/features/progress/weight-store";
import { patchProfile, type UpdateProfileBody } from "@/lib/api/profile";
import type { MeResponse } from "@/lib/api/me";
import { errorMessage, logger } from "@/lib/logger";
import { invalidateGoal } from "@/features/goal/goal-store";
import { useMeStore } from "@/stores/me-store";

import { affectsPlan, type PrefsSource } from "./profile-format";

export type RebuildSection = "training" | "nutrition";

const NUTRITION_KEYS = ["mealsPerDay", "dietTags"];

/** Write server truth into the me-store so every units/prefs reader updates at once. */
const mergeMe = (patch: Partial<Pick<MeResponse, "profile" | "preferences">>) =>
  useMeStore.setState((s) => (s.me ? { me: { ...s.me, ...patch } } : {}));

/**
 * Saves S41 edits: PATCH /v1/me/profile (+ SQLite mirror), weight via the weight log.
 * Plan-affecting changes raise an inline rebuild prompt; the plan is never regenerated here.
 */
export const useProfileEdit = () => {
  const [rebuild, setRebuild] = useState<RebuildSection | null>(null);

  const flagRebuild = useCallback((patch: Record<string, unknown>, before: PrefsSource | null) => {
    if (!affectsPlan(patch, before)) return;
    setRebuild(Object.keys(patch).some((k) => NUTRITION_KEYS.includes(k)) ? "nutrition" : "training");
  }, []);

  const save = useCallback(
    async (patch: Record<string, unknown>): Promise<boolean> => {
      const before = (useMeStore.getState().me?.preferences ?? null) as PrefsSource | null;
      try {
        if ("weightKg" in patch) {
          const kg = Number(patch.weightKg);
          const ok = await useWeightStore.getState().logWeight(kg);
          if (!ok) return false;
          const me = useMeStore.getState().me;
          if (me?.profile) mergeMe({ profile: { ...me.profile, weightKg: kg } });
          return true;
        }
        const res = await patchProfile(patch as UpdateProfileBody);
        mergeMe({ profile: res.profile, preferences: res.preferences });
        // Goal weight / pace / train days may start a new goal version server-side.
        invalidateGoal();
        await patchLocalProfile(patch).catch((err: unknown) =>
          logger.warn("profile.local_mirror_failed", { message: errorMessage(err) }),
        );
        flagRebuild(patch, before);
        return true;
      } catch (err) {
        logger.warn("profile.save_failed", { message: errorMessage(err) });
        return false;
      }
    },
    [flagRebuild],
  );

  return { save, rebuild, flagRebuild, dismissRebuild: () => setRebuild(null) };
};
