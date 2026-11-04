import { useEffect, useState } from "react";

import { isPaywallSoftSkipped } from "@/lib/auth";
import type { ColdStartDest } from "@/lib/auth/cold-start-route";
import { errorMessage, logger } from "@/lib/logger";

import { loadFunnelSnapshot, resolveFunnelDestination } from "./funnel-state";

const RETRY_MS = 800;
const MAX_TRIES = 3;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const resolveOnce = async (): Promise<ColdStartDest> => {
  const snapshot = await loadFunnelSnapshot();
  // Dev Tester soft-skip unlocks tabs without Pro (same as the live guard).
  const input = isPaywallSoftSkipped() ? { ...snapshot, entitled: true } : snapshot;
  return resolveFunnelDestination(input);
};

/**
 * Tab-guard hydration (AMI-177). Cold deep links (`/rebuild`, back from `/strength-ladder`)
 * mount tabs without `app/index.tsx`, so the in-memory onboarding flag is still false.
 * Resolve the funnel from GET /v1/me + SQLite first; `undefined` = still hydrating.
 * Resolving to Today marks the funnel complete, which unlocks the guard.
 */
export const useTabGuardHydration = (needed: boolean): ColdStartDest | undefined => {
  const [dest, setDest] = useState<ColdStartDest | undefined>(undefined);

  useEffect(() => {
    if (!needed) {
      setDest(undefined);
      return;
    }
    let live = true;
    void (async () => {
      for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
        try {
          const next = await resolveOnce();
          logger.info("tabs.guard_hydrated", { dest: next });
          if (live) setDest(next);
          return;
        } catch (err) {
          logger.warn("tabs.guard_hydrate_failed", { attempt, message: errorMessage(err) });
          await sleep(RETRY_MS);
        }
      }
      // Local storage is broken: restart the funnel from the boot gate's first screen.
      if (live) setDest("/(onboarding)/splash");
    })();
    return () => {
      live = false;
    };
  }, [needed]);

  return dest;
};
