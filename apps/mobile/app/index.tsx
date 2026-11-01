import { Redirect, type Href } from "expo-router";
import { useEffect, useState } from "react";

import {
  loadFunnelSnapshot,
  resolveFunnelDestination,
} from "@/features/onboarding/services/funnel-state";
import type { ColdStartDest } from "@/lib/auth/cold-start-route";
import { logger } from "@/lib/logger";

/**
 * Cold open gate (after `_layout` hydrates auth). Consults GET /v1/me
 * (offline → persisted /me cache + local flags):
 * - session + onboarded + entitled → Today
 * - session + onboarded, unentitled → paywall (week-reveal if mid-funnel)
 * - session, not onboarded → resume quiz / reveal (never the auth screen)
 * - no session → splash, or week-reveal when a guest plan exists
 */
const Index = () => {
  const [href, setHref] = useState<ColdStartDest | null>(null);

  useEffect(() => {
    void (async () => {
      const snapshot = await loadFunnelSnapshot();
      const dest = await resolveFunnelDestination(snapshot);
      logger.info("boot.route", { dest });
      setHref(dest);
    })();
  }, []);

  if (!href) return null;
  return <Redirect href={href as Href} />;
};

export default Index;
