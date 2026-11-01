import { Redirect, type Href } from "expo-router";
import { useEffect, useState } from "react";

import { useOnboardingStore } from "@/features/onboarding";
import { isOnboardingCompleteLocal } from "@/features/onboarding/services/memory-store";
import { hasSession } from "@/lib/auth";
import {
  resolveColdStartRoute,
  type ColdStartDest,
} from "@/lib/auth/cold-start-route";
import { logger } from "@/lib/logger";

/**
 * Cold open gate (after `_layout` hydrates auth):
 * - session + onboarding done → Today
 * - session + onboarding incomplete → resume welcome
 * - no session → splash → welcome
 */
const Index = () => {
  const [href, setHref] = useState<ColdStartDest | null>(null);
  const markCompleted = useOnboardingStore((s) => s.markCompleted);

  useEffect(() => {
    void (async () => {
      const storeDone = useOnboardingStore.getState().completed;
      const onboardingCompleted =
        storeDone || (hasSession() ? await isOnboardingCompleteLocal() : false);
      if (onboardingCompleted && !storeDone) markCompleted();
      const dest = resolveColdStartRoute({
        hasSession: hasSession(),
        onboardingCompleted,
      });
      logger.info("boot.route", { dest });
      setHref(dest);
    })();
  }, [markCompleted]);

  if (!href) return null;
  return <Redirect href={href as Href} />;
};

export default Index;
