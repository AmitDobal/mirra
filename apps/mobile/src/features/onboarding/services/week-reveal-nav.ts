import { router } from "expo-router";

import { hasSession, setPostAuthIntent } from "@/lib/auth";

import { finishAfterAuth } from "./post-auth-flow";

/** Primary CTA: skip auth when a session exists (→ paywall/tabs via /v1/me), else auth. */
export const handleWeekRevealStart = (): void => {
  setPostAuthIntent("paywall");

  if (hasSession()) {
    void finishAfterAuth("existing");
    return;
  }

  router.push("/(onboarding)/auth");
};
