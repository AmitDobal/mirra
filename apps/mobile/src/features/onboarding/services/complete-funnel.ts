import { markOnboardingComplete } from "@/db";
import { ensureMirraDb } from "@/lib/local";
import { errorMessage, logger } from "@/lib/logger";

import { useOnboardingStore } from "../store";

/** Soft-finish: durable SQLite flag + Zustand. Call after auth (free) or paywall. */
export const completeOnboardingFunnel = async (): Promise<void> => {
  useOnboardingStore.getState().markCompleted();
  try {
    await ensureMirraDb();
    await markOnboardingComplete();
  } catch (err) {
    logger.warn("onboarding.complete_failed", { message: errorMessage(err) });
  }
};
