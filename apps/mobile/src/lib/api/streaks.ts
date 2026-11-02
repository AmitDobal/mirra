import { apiFetch } from "./client";

/** Mirrors contracts `StreakKindSchema`. */
export type StreakKind = "check_in" | "workout";

/** Mirrors contracts `StreakFireStateSchema`. */
export type StreakFireState = "lit" | "at_risk" | "cold";

/** Mirrors contracts `StreakSchema`. */
export type Streak = {
  readonly kind: StreakKind;
  readonly current: number;
  readonly best: number;
  readonly lastActiveDate: string | null;
  readonly freezeRemaining: number;
  readonly fire: StreakFireState;
};

/** Mirrors contracts `StreaksResponseSchema`. */
export type StreaksResponse = {
  readonly today: string;
  readonly streaks: readonly Streak[];
};

export const getStreaks = () => apiFetch<StreaksResponse>("/v1/streaks", { quiet: true });
