/**
 * Goal timeline store (S44 / S45 / S46). Logic in `goal-store-core.ts`; this binds the real API
 * and the SQLite ai-cache (`goal:v1`, per local user) so offline launches show the last card.
 */
import { useEffect } from "react";
import { useStore } from "zustand";

import { getCached, setCached } from "@/db/repositories/ai-cache";
import { getGoal, restartGoal } from "@/lib/api/goal";

import { createGoalStore, type GoalCacheEntry, type GoalState } from "./goal-store-core";

export const GOAL_CACHE_KEY = "goal:v1";
/** SWR always revalidates; the TTL only bounds how old an offline card may get. */
const GOAL_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const goalStore = createGoalStore({
  fetch: getGoal,
  restart: restartGoal,
  readCache: async () => {
    const hit = await getCached<GoalCacheEntry>(GOAL_CACHE_KEY);
    if (!hit || hit.fetchedAt + hit.ttlMs < Date.now()) return null;
    return hit.payload;
  },
  writeCache: async (entry) => {
    await setCached(GOAL_CACHE_KEY, entry, GOAL_CACHE_TTL_MS);
  },
});

export const useGoalStore = <T>(selector: (s: GoalState) => T): T => useStore(goalStore, selector);

/** Body + status; loads on mount (cached data paints first). */
export const useGoal = () => {
  const data = useGoalStore((s) => s.data);
  const status = useGoalStore((s) => s.status);
  const load = useGoalStore((s) => s.load);
  useEffect(() => {
    void load();
  }, [load]);
  return { data, status, refresh: load };
};

/** Call after any goal input changes server-side (weight, workout, check-in, profile, plan chat). */
export const invalidateGoal = (): void => {
  void goalStore.getState().invalidate();
};
