import { isOnboardingCompleteLocal } from "@/features/onboarding/services/memory-store";
import { useOnboardingStore } from "@/features/onboarding/store";
import { requireSignedInUser } from "@/lib/auth";

/**
 * Meal generate only after funnel soft-finish AND Google session.
 * Never during week-reveal / guest auth. Dev Tester free tabs do not unlock.
 */
export const canGenerateMealPlanSync = (): boolean =>
  requireSignedInUser() && useOnboardingStore.getState().completed;

export const canGenerateMealPlan = async (): Promise<boolean> => {
  if (!requireSignedInUser()) return false;
  if (useOnboardingStore.getState().completed) return true;
  return isOnboardingCompleteLocal();
};
