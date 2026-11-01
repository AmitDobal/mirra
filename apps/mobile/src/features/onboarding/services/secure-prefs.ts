import {
  generatePlan,
  getCurrentPlan as getApiCurrentPlan,
  getPlanJob,
  putOnboarding,
} from "@/lib/api";
import { errorMessage, logger } from "@/lib/logger";

import { toOnboardingBody } from "../map-body";
import { useOnboardingStore } from "../store";
import { persistOnboardingProfile, persistWeekPlan } from "./plan-persist";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * After Google `setGoogleSession`, push local quiz + plan to D1 under the
 * real identity. Guests must not leave personalization device-only.
 */
export const syncPersonalizationAfterAuth = async (): Promise<void> => {
  const answers = useOnboardingStore.getState();
  const body = toOnboardingBody(answers);

  try {
    await persistOnboardingProfile(body);
  } catch (err) {
    logger.warn("auth.secure_prefs.local_failed", { message: errorMessage(err) });
  }

  try {
    await putOnboarding(body);
  } catch (err) {
    logger.warn("auth.secure_prefs.put_failed", { message: errorMessage(err) });
    return;
  }

  try {
    const existing = await getApiCurrentPlan();
    if (existing?.days?.length) return;

    const { jobId } = await generatePlan(`post-auth-${Date.now()}`);
    for (let i = 0; i < 20; i++) {
      const job = await getPlanJob(jobId);
      if (job.status === "failed") break;
      if (job.status === "done" || job.status === "succeeded") {
        const raw = await getApiCurrentPlan();
        if (raw?.days?.length && answers.weekPlan) {
          await persistWeekPlan(
            {
              ...answers.weekPlan,
              id: raw.id,
              version: raw.version,
              status: raw.status,
              weekStart: raw.weekStart,
            },
            "api",
          );
        }
        return;
      }
      await sleep(400);
    }
  } catch (err) {
    logger.warn("auth.secure_prefs.plan_failed", { message: errorMessage(err) });
  }
};
