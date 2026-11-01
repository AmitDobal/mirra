import { apiFetch } from "./client";

/** Mirrors contracts `nutrition-history.ts` / `workout-history.ts` (AMI-131). */
export type HistoryRange = "day" | "week" | "month";

export type NutritionSummaryDay = {
  readonly date: string;
  readonly kcalIn: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
  readonly kcalTarget: number;
  readonly workoutMinutes: number;
  readonly setsCompleted: number;
};

export type NutritionSummary = {
  readonly range: HistoryRange;
  readonly anchor: string;
  readonly from: string;
  readonly to: string;
  readonly series: readonly NutritionSummaryDay[];
  readonly totals: {
    readonly kcalIn: number;
    readonly proteinG: number;
    readonly carbsG: number;
    readonly fatG: number;
    readonly daysLogged: number;
    readonly avgKcalPerLoggedDay: number;
    readonly daysOnTarget: number;
  };
};

export type WorkoutSummaryDay = {
  readonly date: string;
  readonly sessions: number;
  readonly minutes: number;
  readonly setsCompleted: number;
  readonly volumeKg: number;
};

export type WorkoutSummary = {
  readonly range: HistoryRange;
  readonly anchor: string;
  readonly from: string;
  readonly to: string;
  readonly series: readonly WorkoutSummaryDay[];
  readonly totals: {
    readonly sessions: number;
    readonly minutes: number;
    readonly setsCompleted: number;
    readonly volumeKg: number;
  };
};

export const getNutritionSummary = (range: HistoryRange, anchor?: string) =>
  apiFetch<NutritionSummary>("/v1/nutrition/summary", { query: { range, anchor } });

export const getWorkoutSummary = (range: HistoryRange, anchor?: string) =>
  apiFetch<WorkoutSummary>("/v1/workouts/summary", { query: { range, anchor } });
