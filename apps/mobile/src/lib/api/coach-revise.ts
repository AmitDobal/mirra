import { apiFetch } from "./client";
import type { DayMealPlan } from "./meal-plan";

export type CoachReviseScope = "auto" | "meal" | "workout" | "both";

/** Mirrors contracts `coach.ts` (`POST /v1/coach/revise`). */
export type CoachReviseBody = {
  readonly message: string;
  readonly scope?: CoachReviseScope;
  readonly date?: string;
  readonly dryRun?: boolean;
  readonly context?: {
    readonly workoutId?: string;
    readonly mealItemId?: string;
    readonly exerciseId?: string;
  };
};

export type CoachReviseChange = {
  readonly kind: string;
  readonly summary: string;
};

export type CoachReviseResponse = {
  readonly message: string;
  readonly changes: readonly CoachReviseChange[];
  readonly applied: boolean;
  readonly source: "openai" | "heuristic";
  readonly mealPlan?: DayMealPlan | null;
  readonly workoutTitle?: string | null;
  readonly warnings?: readonly string[];
};

/** POST /v1/coach/revise — chat message that edits the existing meal + workout plans. */
export const postCoachRevise = (body: CoachReviseBody) =>
  apiFetch<CoachReviseResponse>("/v1/coach/revise", { method: "POST", body });
