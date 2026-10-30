import { getProfile } from "@/db";
import { ensureMirraDb } from "@/lib/local";

import type { OnboardingWeekPlan } from "../types";
import { loadWeekPlanFromDb, persistWeekPlan } from "./plan-persist";

/**
 * @deprecated Thin shim — plan lives in SQLite; completed flag on profile.
 * Prefer `loadWeekPlanFromDb` / `persistWeekPlan` / `getProfile`.
 */

/** @deprecated Use `persistWeekPlan`. */
export const savePlanLocal = async (
  next: OnboardingWeekPlan,
): Promise<OnboardingWeekPlan> => persistWeekPlan(next, next.source);

/** @deprecated Use `loadWeekPlanFromDb`. */
export const getPlanLocal = (): Promise<OnboardingWeekPlan | null> =>
  loadWeekPlanFromDb();

/**
 * No-op for writes: `saveOnboarding` already sets `onboarding_completed_at`.
 * Zustand still tracks UI `completed`.
 */
export const markOnboardingCompleteLocal = (): void => {
  /* profile timestamp set during generate */
};

/** Async read of SQLite profile flag. */
export const isOnboardingCompleteLocal = async (): Promise<boolean> => {
  await ensureMirraDb();
  const profile = await getProfile();
  return profile?.onboardingCompletedAt != null;
};

/** @deprecated Clearing SQLite plans is out of scope for this shim. */
export const clearOnboardingLocal = (): void => {
  /* no-op — use DB repos if a reset is needed */
};

export { loadWeekPlanFromDb };
