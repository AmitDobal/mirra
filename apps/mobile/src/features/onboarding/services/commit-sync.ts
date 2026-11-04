import { putOnboarding } from "@/lib/api";
import { hasSession } from "@/lib/auth";
import { errorMessage, logger } from "@/lib/logger";

import { toOnboardingBody } from "../map-body";
import { useOnboardingStore } from "../store";
import { patchCommitment } from "./commitment-patch";
import { checkOnboardingSubmit } from "./run-generate";

/**
 * S43 commit / "Not now" (AMI-180). Generating already PUT the answers, so with a live
 * session the commitment goes out in a second PUT under the same AMI-177 guard
 * (`skip` → PATCH commitment only, `reset` for an unpaid re-run). Without a session the
 * post-auth sync (`syncPersonalizationAfterAuth`) sends it with the first real PUT.
 */
export const syncCommitment = async (): Promise<void> => {
  if (!hasSession()) return;
  try {
    const decision = await checkOnboardingSubmit();
    // Onboarded + entitled: no PUT (AMI-177 guard), so send the commitment on its own.
    if (decision === "skip") {
      await patchCommitment();
      return;
    }
    const body = toOnboardingBody(useOnboardingStore.getState());
    await putOnboarding(decision === "reset" ? { ...body, reset: true } : body);
  } catch (err) {
    logger.warn("onboarding.commitment_put_failed", { message: errorMessage(err) });
  }
};
