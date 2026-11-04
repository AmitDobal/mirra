import { apiFetch } from "./client";
import type { ExerciseMuscle } from "./exercise-library";

/** Mirrors contracts `TierStandingSchema` (strength.ts). Division 3 = III (entry), 1 = I (top). */
export type ApiTierStanding = {
  readonly step: number;
  readonly tier: "iron" | "bronze" | "silver" | "gold" | "platinum" | "diamond" | "elite" | "legendary";
  readonly division: 1 | 2 | 3 | null;
  readonly label: string;
  readonly pct: number;
  readonly progressToNext: number | null;
};

/** Mirrors contracts `NextTargetSchema`. */
export type ApiNextTarget = {
  readonly toLabel: string;
  readonly exerciseId: string;
  readonly exerciseName: string;
  readonly weightKg: number | null;
  readonly reps: number;
  readonly sessions: number;
  /** "185 lb × 8", "+10 kg × 6", "BW × 9", "75 s hold". */
  readonly display: string;
};

/** Mirrors contracts `TierChangeSchema`. */
export type ApiTierChange = {
  readonly scope: "exercise" | "muscle" | "group" | "overall";
  readonly refId: string;
  readonly name: string;
  readonly from: ApiTierStanding | null;
  readonly to: ApiTierStanding;
};

/** Mirrors contracts `ExerciseStrengthResponseSchema` (`GET /v1/strength/exercises/:exerciseId`). */
export type ExerciseStrength = {
  readonly exerciseId: string;
  readonly name: string;
  readonly units: "metric" | "imperial";
  readonly ranked: boolean;
  readonly standing: ApiTierStanding | null;
  readonly next: ApiNextTarget | null;
  readonly bestSet: { readonly weightKg: number | null; readonly reps: number } | null;
  readonly muscles: readonly ExerciseMuscle[];
};

export const getExerciseStrength = (exerciseId: string) =>
  apiFetch<ExerciseStrength>(`/v1/strength/exercises/${encodeURIComponent(exerciseId)}`);
