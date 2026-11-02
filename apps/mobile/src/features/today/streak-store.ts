import { create } from "zustand";

import { getStreaks, type Streak } from "@/lib/api";

type StreakStoreState = {
  /** The `check_in` streak from the last successful sync (survives offline). `null` until the first sync. */
  readonly checkIn: Streak | null;
  /** Non-blocking: the chip appears once loaded. Failure keeps the cached streak. */
  readonly load: () => Promise<void>;
};

export const useStreakStore = create<StreakStoreState>((set) => ({
  checkIn: null,

  load: async () => {
    try {
      const { streaks } = await getStreaks();
      const checkIn = streaks.find((s) => s.kind === "check_in");
      if (checkIn) set({ checkIn });
    } catch {
      /* offline: keep the last synced streak */
    }
  },
}));
