import { create } from "zustand";

import {
  getAttendanceWeek,
  type AttendanceState,
  type AttendanceWeek,
} from "@/lib/api";

type AttendanceStoreState = {
  /** Presence by `YYYY-MM-DD`, cached from the last successful sync (survives offline). */
  readonly byDate: Readonly<Record<string, AttendanceState>>;
  /** User's local today per the server (profile timezone). `null` until the first sync. */
  readonly today: string | null;
  readonly merge: (week: AttendanceWeek) => void;
  /** Non-blocking: dots fade in after the strip renders. Failure keeps the cached dots. */
  readonly load: (weekStart: string | undefined) => Promise<void>;
};

export const useAttendanceStore = create<AttendanceStoreState>((set, get) => ({
  byDate: {},
  today: null,

  merge: (week) =>
    set((state) => ({
      today: week.today,
      byDate: {
        ...state.byDate,
        ...Object.fromEntries(week.days.map((d) => [d.date, d.state])),
      },
    })),

  load: async (weekStart) => {
    if (!weekStart) return;
    try {
      const week = await getAttendanceWeek(weekStart);
      get().merge(week);
    } catch {
      /* offline: keep the last synced dots */
    }
  },
}));
