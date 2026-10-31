import { create } from "zustand";

import {
  addWeightLog,
  getProfile,
  listWeightLogs,
  removeWeightLog,
  replaceWeightLogs,
  setProfileWeight,
  type LocalWeightLog,
} from "@/db";
import {
  getMyGoalWeightKg,
  listWeightApi,
  logWeightApi,
  WEIGHT_LIST_LIMIT,
} from "@/lib/api/weight";
import { errorMessage, logger } from "@/lib/logger";

export type WeightEntry = LocalWeightLog;

const LOCAL_ID_PREFIX = "wt_";

export const WEIGHT_MIN_KG = 30;
export const WEIGHT_MAX_KG = 400;

type WeightState = {
  /** Newest first. */
  readonly entries: readonly WeightEntry[];
  readonly goalKg: number | null;
  readonly logging: boolean;
  /** Local rows first (instant), then the server list as source of truth. */
  readonly hydrate: () => Promise<void>;
  /** Write local, then API. Resolves true when stored (server sync best-effort). */
  readonly logWeight: (kg: number) => Promise<boolean>;
};

const sortNewest = (rows: readonly WeightEntry[]): WeightEntry[] =>
  [...rows].sort((a, b) => b.loggedAt - a.loggedAt || b.id.localeCompare(a.id));

export const useWeightStore = create<WeightState>((set, get) => ({
  entries: [],
  goalKg: null,
  logging: false,

  hydrate: async () => {
    try {
      const profile = await getProfile();
      const local = await listWeightLogs(undefined, WEIGHT_LIST_LIMIT);
      set({ entries: local, goalKg: profile?.goalWeightKg ?? get().goalKg });
    } catch (err) {
      logger.warn("weight.hydrate.local_failed", { message: errorMessage(err) });
    }
    try {
      const remote = await listWeightApi();
      // Keep rows that only exist on-device (logged offline, not yet synced).
      const unsynced = get().entries.filter((e) => e.id.startsWith(LOCAL_ID_PREFIX));
      const items = sortNewest([...remote.items, ...unsynced]);
      set({ entries: items });
      await replaceWeightLogs(items);
    } catch (err) {
      logger.warn("weight.hydrate.api_failed", { message: errorMessage(err) });
    }
    if (get().goalKg !== null) return;
    try {
      set({ goalKg: await getMyGoalWeightKg() });
    } catch {
      /* goal is optional */
    }
  },

  logWeight: async (kg) => {
    if (get().logging) return false;
    if (!Number.isFinite(kg) || kg < WEIGHT_MIN_KG || kg > WEIGHT_MAX_KG) return false;
    set({ logging: true });
    const loggedAt = Date.now();
    let localId: string | null = null;
    try {
      const saved = await addWeightLog({ kg, loggedAt });
      localId = saved.id;
      await setProfileWeight(kg);
      set((s) => ({ entries: sortNewest([saved, ...s.entries]) }));
    } catch (err) {
      logger.warn("weight.local_save_failed", { message: errorMessage(err) });
    }

    try {
      const remote = await logWeightApi({ kg, loggedAt });
      if (localId) await removeWeightLog(localId);
      await addWeightLog({ id: remote.id, kg: remote.kg, loggedAt: remote.loggedAt });
      set((s) => ({
        entries: sortNewest([remote, ...s.entries.filter((e) => e.id !== localId)]),
      }));
      return true;
    } catch (err) {
      logger.error("weight.log_api_failed", { message: errorMessage(err) });
      return localId !== null;
    } finally {
      set({ logging: false });
    }
  },
}));
