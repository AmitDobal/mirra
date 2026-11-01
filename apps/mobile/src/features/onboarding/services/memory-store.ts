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

/** @deprecated Prefer `completeOnboardingFunnel`. */
export const markOnboardingCompleteLocal = (): void => {
  /* durable write via completeOnboardingFunnel */
};

/** Funnel finished (auth + paywall soft finish) — cold start → Today. */
export const isOnboardingCompleteLocal = async (): Promise<boolean> => {
  await ensureMirraDb();
  const profile = await getProfile();
  return profile?.onboardingCompletedAt != null;
};

/** Plan generated but funnel may still need auth/paywall. */
export const isPlanGeneratedLocal = async (): Promise<boolean> => {
  await ensureMirraDb();
  const profile = await getProfile();
  if (profile?.planGeneratedAt != null) return true;
  if (profile?.onboardingCompletedAt != null) return true;
  const plan = await loadWeekPlanFromDb();
  return plan != null;
};

/** @deprecated Clearing SQLite plans is out of scope for this shim. */
export const clearOnboardingLocal = (): void => {
  /* no-op — use DB repos if a reset is needed */
};

export { loadWeekPlanFromDb };
