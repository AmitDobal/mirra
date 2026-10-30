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

export type SessionMinutes = 20 | 30 | 45 | 60;

export type PaywallPlan = "annual" | "monthly";

export type OnboardingAnswers = {
  goal: GoalId | null;
  experience: ExperienceId | null;
  sex: SexId;
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
  foodsToAvoid: string;
  mirrorSkipped: boolean;
  paywallPlan: PaywallPlan;
  completed: boolean;
};
