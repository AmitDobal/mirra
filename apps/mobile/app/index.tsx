import { Redirect, type Href } from "expo-router";
import { useEffect, useState } from "react";

import { useOnboardingStore } from "@/features/onboarding";
import {
  isOnboardingCompleteLocal,
  isPlanGeneratedLocal,
} from "@/features/onboarding/services/memory-store";
import { hasSession } from "@/lib/auth";
import {
  resolveColdStartRoute,
  type ColdStartDest,
} from "@/lib/auth/cold-start-route";
import { logger } from "@/lib/logger";

/**
 * Cold open gate (after `_layout` hydrates auth):
 * - session + funnel done → Today
 * - plan generated (guest or mid-funnel) → week-reveal (not Today)
 * - session + incomplete → welcome
 * - no session → splash → welcome
 */
const Index = () => {
  const [href, setHref] = useState<ColdStartDest | null>(null);
  const markCompleted = useOnboardingStore((s) => s.markCompleted);

  useEffect(() => {
    void (async () => {
      const storeDone = useOnboardingStore.getState().completed;
      const onboardingCompleted =
        storeDone || (await isOnboardingCompleteLocal());
      const planGenerated =
        onboardingCompleted ||
        Boolean(useOnboardingStore.getState().weekPlan) ||
        (await isPlanGeneratedLocal());
      if (onboardingCompleted && !storeDone) markCompleted();
      const dest = resolveColdStartRoute({
        hasSession: hasSession(),
        onboardingCompleted,
        planGenerated,
      });
      logger.info("boot.route", { dest });
      setHref(dest);
    })();
  }, [markCompleted]);

  if (!href) return null;
  return <Redirect href={href as Href} />;
};

export default Index;
