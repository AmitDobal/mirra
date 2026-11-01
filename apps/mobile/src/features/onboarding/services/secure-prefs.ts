import {
  generatePlan,
  getCurrentPlan as getApiCurrentPlan,
  getPlanJob,
  putOnboarding,
} from "@/lib/api";
import type { MeResponse } from "@/lib/api/me";
import { errorMessage, logger } from "@/lib/logger";
import { useMeStore } from "@/stores/me-store";

import { toOnboardingBody } from "../map-body";
import { useOnboardingStore } from "../store";
import { fetchMeOrNull } from "./funnel-state";
import { uploadMirrorSelfie } from "./upload-mirror";
import { persistOnboardingProfile, persistWeekPlan } from "./plan-persist";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

type SyncOpts = {
  /** Fresh GET /v1/me taken right after sign-in (fetched here when omitted). */
  readonly me?: MeResponse | null;
  /** Real quiz answers / plan exist locally (not empty store defaults). */
  readonly hasLocalQuiz?: boolean;
};

/**
 * After Google `setGoogleSession`, push local quiz + plan to D1 under the
 * real identity. No-op when the server already has onboarding/prefs (never
 * PUT empty defaults over a returning user) or when no real quiz exists.
 */
export const syncPersonalizationAfterAuth = async (
  opts: SyncOpts = {},
): Promise<void> => {
  const me = opts.me === undefined ? await fetchMeOrNull() : opts.me;
  if (!me) {
    logger.warn("auth.secure_prefs.skipped_me_unknown");
    return;
  }
  if (me.onboardingCompleted || me.preferences) {
    logger.info("auth.secure_prefs.skipped_server_has_profile");
    return;
  }
  const hasQuiz =
    opts.hasLocalQuiz ?? Boolean(useOnboardingStore.getState().weekPlan);
  if (!hasQuiz) {
    logger.info("auth.secure_prefs.skipped_no_local_quiz");
    return;
  }

  // Guest-owned media is not valid under the Google identity: re-upload first.
  await uploadMirrorSelfie();
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
  useMeStore.getState().refreshInBackground();

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
