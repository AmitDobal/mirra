import { router } from "expo-router";

import { requireSignedInUser, setPostAuthIntent } from "@/lib/auth";
import { useEntitlementStore } from "@/stores/entitlement-store";

import { completeOnboardingFunnel } from "./complete-funnel";

/** Primary CTA: auth → paywall (skip auth if already Google). */
export const handleWeekRevealStart = (): void => {
  setPostAuthIntent("paywall");

  if (requireSignedInUser()) {
    if (useEntitlementStore.getState().isPro) {
      void completeOnboardingFunnel().then(() => {
        router.replace("/(tabs)/today");
      });
      return;
    }
    router.push("/(onboarding)/paywall");
    return;
  }

  router.push("/(onboarding)/auth");
};
