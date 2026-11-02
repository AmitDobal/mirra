import { create } from "zustand";

import { getBadges, type BadgesResponse } from "@/lib/api";

type BadgeStoreState = {
  readonly data: BadgesResponse | null;
  readonly load: () => Promise<void>;
  readonly clear: () => void;
};

export const useBadgeStore = create<BadgeStoreState>((set) => ({
  data: null,
  load: async () => {
    try {
      const data = await getBadges();
      set({ data });
    } catch {
      /* keep cached badges offline */
    }
  },
  clear: () => set({ data: null }),
}));
