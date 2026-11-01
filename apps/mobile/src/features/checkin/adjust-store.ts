import { create } from "zustand";

import type { AdjustMode } from "./checkin-logic";

export type TodayAdjustment = {
  readonly date: string;
  readonly mode: Exclude<AdjustMode, "keep">;
  readonly beforeMin: number;
  readonly afterMin: number;
};

type State = {
  readonly adjustment: TodayAdjustment | null;
  readonly set: (adjustment: TodayAdjustment | null) => void;
};

/**
 * Today's accepted check-in adjustment (in-memory overlay on the planned workout).
 * Today reads `adjustment` to show the shorter duration; "Keep original" clears it.
 */
export const useTodayAdjustStore = create<State>((set) => ({
  adjustment: null,
  set: (adjustment) => set({ adjustment }),
}));

/** Minutes to show for a workout on `date`, honouring today's adjustment. */
export const adjustedMinutes = (
  adjustment: TodayAdjustment | null,
  date: string,
  plannedMin: number,
): number => (adjustment && adjustment.date === date ? adjustment.afterMin : plannedMin);
