import { apiFetch } from "./client";

export type AccountabilityScenario =
  | "OVER_KCAL"
  | "UNDER_PROTEIN"
  | "MISSED_LIFT"
  | "UNDER_EATING"
  | "ON_TRACK"
  | "STREAK_BREAK"
  | "LOW_READINESS";

export type PersonalInsights = {
  readonly localDate: string;
  readonly fuel: {
    readonly kcalTarget: number;
    readonly kcalLogged: number;
    readonly kcalRemaining: number;
    /** Signed: logged - target (positive = over). */
    readonly kcalDelta?: number;
    readonly kcalOver?: number;
    /** Signed: logged - target (negative = short). */
    readonly proteinGDelta?: number;
    readonly proteinGTarget: number;
    readonly proteinGLogged: number;
    readonly proteinGRemaining: number;
    readonly mealCount: number;
  };
  readonly training: {
    readonly workoutTitle: string | null;
    readonly workoutDone: boolean;
    readonly sessionsThisWeek: number;
    readonly plannedLiftDays: number;
  };
  readonly checkIn: {
    readonly done: boolean;
    readonly status: string | null;
    readonly streakDays: number;
  };
  readonly briefing: string;
  readonly tips: readonly string[];
  readonly win: string | null;
  readonly scenario?: AccountabilityScenario;
  readonly secondaryScenarios?: readonly AccountabilityScenario[];
  readonly harsh?: boolean;
  readonly accountabilityTip?: string | null;
  readonly historySummary?: string;
};

export const getTodayInsights = (date?: string) =>
  apiFetch<PersonalInsights>("/v1/insights/today", {
    query: date ? { date } : undefined,
  });
