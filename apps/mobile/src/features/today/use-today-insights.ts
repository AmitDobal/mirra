import { useCallback, useRef, useState } from "react";

import { withAiCache } from "@/lib/ai";
import { getTodayInsights, type PersonalInsights } from "@/lib/api";
import { useFuelStore } from "@/features/fuel/fuel-store";

import { useTodayStore } from "./today-store";

/** GET /v1/insights/today is not LLM; this TTL only stops tab-focus churn. */
export const INSIGHTS_TTL_MS = 2 * 60_000;

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Soft-cached daily insights (2 min TTL). `load(true)` (pull-to-refresh) forces
 * a fetch; logging a meal or checking in also busts the cache since both change
 * the numbers.
 */
export const useTodayInsights = () => {
  const [insights, setInsights] = useState<PersonalInsights | null>(null);
  const lastSignature = useRef<string | null>(null);

  const load = useCallback(async (force = false) => {
    const signature = `${useFuelStore.getState().meals.length}:${useTodayStore.getState().checkInDue}`;
    const changed = lastSignature.current !== null && lastSignature.current !== signature;
    try {
      const result = await withAiCache<PersonalInsights>({
        key: `insights:${todayIso()}`,
        ttlMs: INSIGHTS_TTL_MS,
        force: force || changed,
        minRefreshMs: 0,
        fetch: () => getTodayInsights(),
      });
      lastSignature.current = signature;
      setInsights(result.data);
    } catch {
      setInsights(null);
    }
  }, []);

  return { insights, load };
};
