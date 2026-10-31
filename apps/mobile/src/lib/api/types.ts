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
    /** Required by the API (min 1). */
    readonly cuisineStyles: string[];
    readonly units?: "metric" | "imperial";
    readonly trainerPersona?: "drill" | "honey" | "wit" | "spark" | "zen" | "rival";
    readonly physiqueTarget?:
      | "lean_cut"
      | "athletic"
      | "muscular"
      | "toned"
      | "strong"
      | null;
    readonly lifestyleNotes?: string | null;
  };
};

export type PlanGenerateResponse = { readonly jobId: string };

export type PlanJobStatus =
  | "queued"
  | "running"
  | "done"
  | "succeeded"
  | "failed";

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
  /** Planned working load; absent until the plan generator provides one. */
  readonly targetLoadKg?: number | null;
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
  readonly day?: {
    readonly id: string;
    readonly kind: string;
    readonly label?: string | null;
  };
  /** Legacy shape — prefer `fuel`. */
  readonly fuelRemaining?: {
    readonly calories?: number;
    readonly proteinG?: number;
  };
  readonly fuel?: {
    readonly kcalTarget?: number;
    readonly kcalLogged?: number;
    readonly kcalRemaining?: number;
    readonly proteinGTarget?: number;
    readonly proteinGLogged?: number;
  };
  readonly weekStrip?: readonly {
    date: string;
    kind: string;
    dayIndex?: number;
    label?: string | null;
    isToday?: boolean;
    done?: boolean;
  }[];
  readonly checkInDue: boolean;
  readonly summary?: Record<string, unknown>;
};

/** Mirrors contracts `CheckInStatusSchema`. */
export type CheckInStatus =
  | "done"
  | "partial"
  | "skipped"
  | "soreness"
  | "low_sleep"
  | "travel";

export type CheckIn = {
  readonly id: string;
  readonly localDate: string;
  readonly status: CheckInStatus;
  readonly note?: string | null;
  readonly triggeredRebuild?: boolean;
  readonly coachMessage?: string;
};

export type CreateCheckInBody = {
  readonly localDate: string;
  readonly status: CheckInStatus;
  readonly note?: string;
};

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

/** Mirrors contracts `MealResponseSchema`. */
export type Meal = {
  readonly id: string;
  readonly name: string;
  readonly mealSlot: MealSlot;
  readonly kcal: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
  /** Unix ms. */
  readonly eatenAt: number;
  readonly mediaId: string | null;
  readonly createdAt: number;
};

/** Mirrors contracts `MealBodySchema` — `mealSlot` + `kcal` are required. */
export type CreateMealBody = {
  readonly name: string;
  readonly mealSlot: MealSlot;
  readonly kcal: number;
  readonly proteinG?: number;
  readonly carbsG?: number;
  readonly fatG?: number;
  /** Unix ms. */
  readonly eatenAt?: number;
  readonly mediaId?: string | null;
};

export type MacroTotals = {
  readonly kcal: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
};

/** Mirrors contracts `FuelTodayResponseSchema`. */
export type FuelTodayResponse = {
  readonly date: string;
  readonly targets: MacroTotals;
  readonly logged: MacroTotals;
  readonly remaining: MacroTotals;
  readonly meals: readonly Meal[];
  /** Present once the API ships `water_logs`. */
  readonly hydration?: { readonly targetMl: number; readonly loggedMl: number } | null;
};

/** Mirrors contracts workouts schemas. */
export type WorkoutSession = {
  readonly id: string;
  readonly workoutId: string | null;
  readonly startedAt: number;
  readonly endedAt: number | null;
  readonly rpe: number | null;
  readonly notes: string | null;
};

export type StartWorkoutSessionBody = { readonly workoutId: string };

/** `setIndex` is 1-based on the API. */
export type LogSetBody = {
  readonly exerciseId?: string | null;
  readonly exerciseName: string;
  readonly setIndex: number;
  readonly weightKg?: number | null;
  readonly reps?: number | null;
  readonly completed?: boolean;
};

export type SetLog = {
  readonly id: string;
  readonly sessionId: string;
  readonly exerciseId: string | null;
  readonly exerciseName: string;
  readonly setIndex: number;
  readonly weightKg: number | null;
  readonly reps: number | null;
  readonly completed: boolean;
  readonly loggedAt: number;
};

export type CompleteSessionBody = {
  readonly rpe?: number | null;
  readonly notes?: string | null;
};

export type CoachReadiness = "push" | "rest";

export type CoachVector = {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly recommended?: boolean;
};

export type CoachAdviseBody = {
  readonly readiness: CoachReadiness;
  readonly localDate?: string;
  readonly vectorId?: string;
};

/** Mirrors contracts `CoachPillSchema`. */
export type CoachPillTone = "calm" | "push" | "alert" | "win";

export type CoachPill = {
  readonly id: string;
  readonly label: string;
  readonly tone: CoachPillTone;
};

export type CoachAdviseResponse = {
  readonly message: string;
  readonly vectors?: readonly CoachVector[];
  readonly pills?: readonly CoachPill[];
  readonly coachMessage?: string;
  readonly source?: "openai" | "heuristic";
};
