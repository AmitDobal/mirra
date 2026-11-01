import { router, type Href } from "expo-router";

import { takePostAuthIntent } from "@/lib/auth";
import { devTesterAllowed } from "@/lib/auth/dev-tester";
import { markPaywallSoftSkipped } from "@/lib/auth/paywall-skip";
import { errorMessage, logger } from "@/lib/logger";

import { completeOnboardingFunnel } from "./complete-funnel";
import {
  loadFunnelSnapshot,
  mirrorServerPlan,
  resolveFunnelDestination,
} from "./funnel-state";
import { syncPersonalizationAfterAuth } from "./secure-prefs";

export type PostAuthKind = "google" | "dev" | "existing";

/**
 * Single post-auth router (Google success, auth-screen mount with a session,
 * week-reveal Start with a session). Decides from GET /v1/me + local truth:
 * new user → onboarding, returning unpaid → paywall, entitled → tabs.
 * Never marks the funnel complete just because sign-in succeeded.
 */
export const finishAfterAuth = async (kind: PostAuthKind): Promise<void> => {
  const intent = takePostAuthIntent();
  try {
    if (kind === "dev" && devTesterAllowed()) {
      markPaywallSoftSkipped();
      await completeOnboardingFunnel();
      router.replace("/(tabs)/today");
      return;
    }

    const snapshot = await loadFunnelSnapshot();
    if (kind !== "existing") {
      // Judged from the pre-sync snapshot: no-op when the server already has data.
      await syncPersonalizationAfterAuth({
        me: snapshot.me,
        hasLocalQuiz: snapshot.planGenerated,
      });
    }
    if (snapshot.serverOnboarded === true) await mirrorServerPlan();

    const dest = await resolveFunnelDestination(snapshot, {
      revealSeen: intent === "paywall",
      afterSignIn: kind !== "existing" || intent === "signin",
    });
    router.replace(dest as Href);
  } catch (err) {
    logger.error("funnel.finish_after_auth_failed", { message: errorMessage(err) });
    router.replace("/(onboarding)/welcome");
  }
};
