import { apiFetch } from "./client";
import type { AccountabilityScenario } from "./insights";

/** Mirrors contracts `today-actions.ts` (`GET /v1/today/actions`). */
export type GoalStatus = "pending" | "done" | "over" | "skipped";
export type GoalKind = "workout" | "meal" | "protein" | "checkin" | "cardio" | "water";
export type GoalTone = "alert" | "warn" | "good";
export type MacroKey = "kcal" | "proteinG" | "carbsG" | "fatG";
export type MacroState = "under" | "hit" | "over";

export type DailyGoal = {
  readonly id: string;
  readonly kind: GoalKind;
  readonly title: string;
  readonly subtitle: string | null;
  readonly status: GoalStatus;
  readonly ctaRoute: string;
  readonly metric: {
    readonly label: "kcal" | "g" | "L" | "sets" | "min";
    readonly current: number;
    readonly target: number;
  } | null;
};

export type NextAction = {
  readonly goalId: string;
  readonly kind: GoalKind;
  readonly title: string;
  readonly ctaRoute: string;
  readonly reason: string;
  readonly ctaLabel: string;
  readonly tone: GoalTone;
};

export type MacroMeter = {
  readonly key: MacroKey;
  readonly target: number;
  readonly logged: number;
  readonly remaining: number;
  /** Signed: logged - target (positive = over). */
  readonly delta: number;
  readonly state: MacroState;
};

export type TodayActionsResponse = {
  readonly date: string;
  readonly tz: string;
  /** Null only when every goal is done or skipped. */
  readonly next: NextAction | null;
  readonly goals: readonly DailyGoal[];
  /** Order: kcal, protein, carbs, fat. */
  readonly macros: readonly MacroMeter[];
  readonly hydration: { readonly targetMl: number; readonly loggedMl: number } | null;
  readonly scenario: AccountabilityScenario;
};

export const getTodayActions = (date?: string) =>
  apiFetch<TodayActionsResponse>("/v1/today/actions", {
    query: date ? { date } : undefined,
  });
