/**
 * Strength tier cache (S34/S35/S37 + You teaser). Stale-while-revalidate:
 * cached data stays on screen while a refetch runs; errors keep the cache.
 */
import type { MuscleId } from "@mirra/contracts";
import { useCallback, useEffect } from "react";
import { create } from "zustand";

import {
  getMuscleStrength,
  getStrengthOverview,
  type MuscleStrengthResponse,
  type StrengthOverviewResponse,
} from "@/lib/api";

export type LoadStatus = "idle" | "loading" | "ready" | "error";

type StrengthState = {
  readonly overview: StrengthOverviewResponse | null;
  readonly overviewStatus: LoadStatus;
  readonly muscles: Partial<Record<MuscleId, MuscleStrengthResponse>>;
  readonly muscleStatus: Partial<Record<MuscleId, LoadStatus>>;
  readonly loadOverview: () => Promise<void>;
  readonly loadMuscle: (id: MuscleId) => Promise<void>;
  readonly clear: () => void;
};

export const useStrengthStore = create<StrengthState>((set, get) => ({
  overview: null,
  overviewStatus: "idle",
  muscles: {},
  muscleStatus: {},
  loadOverview: async () => {
    set({ overviewStatus: "loading" });
    try {
      const overview = await getStrengthOverview();
      // Muscle details depend on the same scores: drop them so sheets refetch.
      set({ overview, overviewStatus: "ready", muscles: {}, muscleStatus: {} });
    } catch {
      set({ overviewStatus: "error" });
    }
  },
  loadMuscle: async (id) => {
    set({ muscleStatus: { ...get().muscleStatus, [id]: "loading" } });
    try {
      const detail = await getMuscleStrength(id);
      set({
        muscles: { ...get().muscles, [id]: detail },
        muscleStatus: { ...get().muscleStatus, [id]: "ready" },
      });
    } catch {
      set({ muscleStatus: { ...get().muscleStatus, [id]: "error" } });
    }
  },
  clear: () => set({ overview: null, overviewStatus: "idle", muscles: {}, muscleStatus: {} }),
}));

/** `GET /v1/strength`, fetched on mount (cached data shows first). */
export const useStrength = () => {
  const data = useStrengthStore((s) => s.overview);
  const status = useStrengthStore((s) => s.overviewStatus);
  const load = useStrengthStore((s) => s.loadOverview);
  useEffect(() => {
    void load();
  }, [load]);
  return { data, status, refresh: load };
};

/** `GET /v1/strength/muscles/:id` while `id` is set. */
export const useMuscleStrength = (id: MuscleId | null) => {
  const data = useStrengthStore((s) => (id ? s.muscles[id] ?? null : null));
  const status = useStrengthStore((s) => (id ? s.muscleStatus[id] ?? "idle" : "idle"));
  const load = useStrengthStore((s) => s.loadMuscle);
  useEffect(() => {
    if (id) void load(id);
  }, [id, load]);
  const retry = useCallback(() => {
    if (id) void load(id);
  }, [id, load]);
  return { data, status, retry };
};
