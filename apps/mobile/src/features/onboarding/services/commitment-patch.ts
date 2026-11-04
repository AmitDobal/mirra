import { invalidateGoal } from "@/features/goal/goal-store";
import { patchProfile } from "@/lib/api/profile";
import { errorMessage, logger } from "@/lib/logger";

import { useOnboardingStore } from "../store";

/**
 * S43 commitment for accounts the onboarding PUT skips (already onboarded server-side, e.g. Dev
 * Tester sign-in after the commit). `PATCH /v1/me/profile { commitment }` sets
 * `goal_plans.committed_at` once (first commit wins). No-op without a local commitment.
 */
export const patchCommitment = async (): Promise<void> => {
  const commitment = useOnboardingStore.getState().commitment;
  if (!commitment) return;
  try {
    await patchProfile({ commitment: { committedAt: commitment.committedAt } });
    logger.info("onboarding.commitment_patched");
    invalidateGoal();
  } catch (err) {
    logger.warn("onboarding.commitment_patch_failed", { message: errorMessage(err) });
  }
};
