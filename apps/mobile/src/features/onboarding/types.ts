export type GoalId =
  | "lose_fat"
  | "build_muscle"
  | "recomp"
  | "consistent"
  | "performance";

export type ExperienceId = "new" | "some_months" | "one_two_years" | "three_plus";

export type SexId = "female" | "male" | "prefer_not";

export type HeightUnit = "cm" | "ft";
export type WeightUnit = "kg" | "lb";

export type PaceId = "steady" | "aggressive";

export type EquipmentId =
  | "full_gym"
  | "dumbbells"
  | "barbell"
  | "machines"
  | "cables"
  | "bands"
  | "bodyweight"
  | "home_minimal";

export type DietId =
  | "no_preference"
  | "high_protein"
  | "vegetarian"
  | "vegan"
  | "halal"
  | "dairy_free"
  | "gluten_free";

export type CuisineId =
  | "indian"
  | "american"
  | "chinese"
  | "japanese"
  | "mediterranean"
  | "mexican"
  | "middle_eastern"
  | "korean"
  | "thai"
  | "other";

import type { TrainerPersonaId } from "@/content/trainer-personas";

export type { TrainerPersonaId };

export type SessionMinutes = 20 | 30 | 45 | 60;

export type PhysiqueId =
  | "lean_cut"
  | "athletic"
  | "muscular"
  | "toned"
  | "strong";

export type PaywallPlan = "annual" | "monthly";

export type PlanOptionKey = "recommended" | "alternate";

export type PlanOptionMeta = {
  key: PlanOptionKey;
  title: string;
  pitch: string;
  badge: string;
};

export type OnboardingPlanExercise = {
  id: string;
  name: string;
  cue?: string | null;
  targetSets: number;
  targetReps: string;
  restSec?: number | null;
};

export type OnboardingPlanWorkout = {
  id: string;
  title: string;
  durationMin: number;
  focus?: string | null;
  exercises: OnboardingPlanExercise[];
};

export type OnboardingPlanDay = {
  id: string;
  dayIndex: number;
  date: string;
  kind: string;
  label?: string | null;
  workoutId?: string | null;
  workout?: OnboardingPlanWorkout | null;
};

export type OnboardingWeekPlan = {
  id: string;
  version: number;
  status: string;
  weekStart: string;
  summary?: {
    kcalTarget?: number;
    proteinG?: number;
    outcomeLine?: string;
    /** Set by API: "openai" | "heuristic". */
    generator?: string;
  };
  days: OnboardingPlanDay[];
  workouts: OnboardingPlanWorkout[];
  source: "api" | "local";
};

export type OnboardingPlanOption = OnboardingWeekPlan & {
  meta: PlanOptionMeta;
};

export type OnboardingAnswers = {
  goal: GoalId | null;
  experience: ExperienceId | null;
  /** Null until body-stats; Continue disabled until female|male|prefer_not. */
  sex: SexId | null;
  age: number;
  heightCm: number;
  heightUnit: HeightUnit;
  weightKg: number;
  weightUnit: WeightUnit;
  goalWeightKg: number | null;
  pace: PaceId;
  equipment: EquipmentId[];
  trainingDays: boolean[];
  sessionMinutes: SessionMinutes;
  diet: DietId[];
  /** Required: at least one cuisine before onboarding can continue. */
  cuisines: CuisineId[];
  /** Free text when "Other" cuisine is selected. */
  cuisineOther: string;
  foodsToAvoid: string;
  /** Optional physique look; null when skipped. */
  physiqueTarget: PhysiqueId | null;
  /** Free-text routine / likes; empty when skipped. */
  lifestyleNotes: string;
  /** Trainer character picked in onboarding; default drill. */
  trainerPersona: TrainerPersonaId;
  mirrorSkipped: boolean;
  /** Local URI after capture / pick; null if skipped or not taken. */
  mirrorUri: string | null;
  /** Confirmed media id from `POST /v1/media/:id/confirm` (kind=mirror); null until uploaded. */
  mirrorMediaId: string | null;
  /** Auth user id that owns `mirrorMediaId` (guest → Google sign-in changes it, so re-upload). */
  mirrorMediaOwnerId: string | null;
  paywallPlan: PaywallPlan;
  completed: boolean;
  weekPlan: OnboardingWeekPlan | null;
  /** Dual programs after generate; user picks one. */
  planOptions: OnboardingPlanOption[] | null;
  selectedPlanKey: PlanOptionKey;
};
