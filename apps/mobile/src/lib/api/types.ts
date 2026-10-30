/** Client DTO shapes aligned with docs/03-engineering/api.md — refine via contracts later. */

export type ApiErrorBody = {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
};

export type OnboardingPutBody = {
  readonly profile: {
    readonly sex?: "female" | "male" | "unspecified" | null;
    readonly ageYears?: number | null;
    readonly heightCm?: number | null;
    readonly weightKg?: number | null;
    readonly goalWeightKg?: number | null;
    readonly pace?: "steady" | "aggressive" | null;
    readonly timezone: string;
  };
  readonly preferences: {
    readonly primaryGoal:
      | "lose_fat"
      | "build_muscle"
      | "recomp"
      | "consistency"
      | "performance";
    readonly experience: "new" | "months" | "y1_2" | "y3_plus";
    readonly equipment?: string[];
    readonly trainDays?: number[];
    readonly sessionMinutes: 20 | 30 | 45 | 60;
    readonly dietTags?: string[];
    readonly foodsAvoid?: string | null;
    readonly units?: "metric" | "imperial";
  };
};

export type PlanGenerateResponse = { readonly jobId: string };

export type PlanJobStatus = "queued" | "running" | "succeeded" | "failed";

export type PlanJobResponse = {
  readonly status: PlanJobStatus;
  readonly planId?: string | null;
  readonly error?: string | null;
};

export type PlanExercise = {
  readonly id: string;
  readonly name: string;
  readonly cue?: string | null;
  readonly targetSets: number;
  readonly targetReps: string;
  readonly restSec?: number | null;
};

export type PlanWorkout = {
  readonly id: string;
  readonly title: string;
  readonly durationMin: number;
  readonly focus?: string | null;
  readonly exercises: readonly PlanExercise[];
};

export type PlanDay = {
  readonly id: string;
  readonly dayIndex: number;
  readonly date: string;
  readonly kind: string;
  readonly label?: string | null;
  readonly workout?: PlanWorkout | null;
};

export type CurrentPlan = {
  readonly id: string;
  readonly version: number;
  readonly status: string;
  readonly weekStart: string;
  readonly summary?: Record<string, unknown>;
  readonly days: readonly PlanDay[];
};

export type TodayResponse = {
  readonly date: string;
  readonly workout: PlanWorkout | null;
  readonly fuelRemaining?: {
    readonly calories?: number;
    readonly proteinG?: number;
  };
  readonly weekStrip?: readonly { date: string; kind: string; done?: boolean }[];
  readonly checkInDue: boolean;
};

export type CheckInStatus = "on_track" | "skipped" | "modified";

export type CheckIn = {
  readonly id: string;
  readonly localDate: string;
  readonly status: CheckInStatus;
  readonly note?: string | null;
};

export type CreateCheckInBody = {
  readonly localDate: string;
  readonly status: CheckInStatus;
  readonly note?: string;
};

export type Meal = {
  readonly id: string;
  readonly name: string;
  readonly calories?: number | null;
  readonly proteinG?: number | null;
  readonly localDate: string;
};

export type CreateMealBody = {
  readonly name: string;
  readonly calories?: number;
  readonly proteinG?: number;
  readonly localDate: string;
  readonly photoMediaId?: string;
};

export type FuelTodayResponse = {
  readonly date: string;
  readonly caloriesTarget?: number;
  readonly caloriesLogged?: number;
  readonly meals: readonly Meal[];
};
