import { z } from "zod";

export const SexSchema = z.enum(["female", "male", "unspecified"]).nullable().optional();
export const PaceSchema = z.enum(["steady", "aggressive"]).nullable().optional();
export const GoalSchema = z.enum([
  "lose_fat",
  "build_muscle",
  "recomp",
  "consistency",
  "performance",
]);
export const ExperienceSchema = z.enum(["new", "months", "y1_2", "y3_plus"]);
export const UnitsSchema = z.enum(["metric", "imperial"]);
export const TrainerPersonaSchema = z.enum(["drill", "honey", "wit", "spark", "zen", "rival"]);
export const PhysiqueTargetSchema = z.enum(["lean_cut", "athletic", "muscular", "toned", "strong"]);
export const MealSlotSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);
export const CheckInStatusSchema = z.enum([
  "done",
  "partial",
  "skipped",
  "soreness",
  "low_sleep",
  "travel",
  "on_track",
  "modified",
]);
export const PoseSchema = z.enum(["front", "side"]);

export const OnboardingInputSchema = z.object({
  userId: z.string().min(1).optional(),
  profile: z.object({
    sex: SexSchema,
    ageYears: z.number().int().positive().nullable().optional(),
    heightCm: z.number().positive().nullable().optional(),
    weightKg: z.number().positive().nullable().optional(),
    goalWeightKg: z.number().positive().nullable().optional(),
    pace: PaceSchema,
    timezone: z.string().min(1),
  }),
  preferences: z.object({
    primaryGoal: GoalSchema,
    experience: ExperienceSchema,
    equipment: z.array(z.string()).optional(),
    trainDays: z.array(z.number().int().min(1).max(7)).optional(),
    sessionMinutes: z.union([z.literal(20), z.literal(30), z.literal(45), z.literal(60)]),
    dietTags: z.array(z.string()).optional(),
    foodsAvoid: z.string().nullable().optional(),
    cuisineStyles: z.array(z.string()).optional(),
    physiqueTarget: PhysiqueTargetSchema.nullable().optional(),
    lifestyleNotes: z.string().max(2000).nullable().optional(),
    units: UnitsSchema.optional(),
    trainerPersona: TrainerPersonaSchema.optional(),
  }),
});

export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;

export type LocalProfile = {
  readonly userId: string;
  readonly sex: string | null;
  readonly ageYears: number | null;
  readonly heightCm: number | null;
  readonly weightKg: number | null;
  readonly goalWeightKg: number | null;
  readonly pace: string | null;
  readonly timezone: string;
  readonly onboardingCompletedAt: number | null;
  readonly preferences: {
    readonly primaryGoal: string;
    readonly experience: string;
    readonly equipment: string[];
    readonly trainDays: number[];
    readonly sessionMinutes: number;
    readonly dietTags: string[];
    readonly foodsAvoid: string | null;
    readonly units: string;
    readonly trainerPersona: string;
    readonly cuisineStyles: string[];
    readonly physiqueTarget: string | null;
    readonly lifestyleNotes: string | null;
    readonly trainingLocation: "gym" | "home" | "hotel";
  } | null;
};

export type PlanSummary = {
  readonly kcalTarget: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
  readonly outcomeLine: string;
};

export type LocalExercise = {
  readonly id: string;
  readonly name: string;
  readonly cue: string | null;
  readonly targetSets: number;
  readonly targetReps: string;
  readonly restSec: number | null;
  readonly swapGroup: string | null;
};

export type LocalWorkout = {
  readonly id: string;
  readonly title: string;
  readonly durationMin: number;
  readonly focus: string | null;
  readonly calorieEst: number | null;
  readonly exercises: readonly LocalExercise[];
};

export type LocalPlanDay = {
  readonly id: string;
  readonly dayIndex: number;
  readonly date: string;
  readonly kind: string;
  readonly label: string | null;
  readonly workout: LocalWorkout | null;
};

export type LocalPlan = {
  readonly id: string;
  readonly version: number;
  readonly status: string;
  readonly weekStart: string;
  readonly summary: PlanSummary;
  readonly days: readonly LocalPlanDay[];
};

export type TodayBundle = {
  readonly date: string;
  readonly planId: string | null;
  readonly day: LocalPlanDay | null;
  readonly summary: PlanSummary | null;
  readonly checkInDue: boolean;
};

export type LocalMeal = {
  readonly id: string;
  readonly name: string;
  readonly mealSlot: string;
  readonly kcal: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
  readonly eatenAt: number;
};

export type FuelToday = {
  readonly date: string;
  readonly caloriesTarget: number | null;
  readonly proteinTarget: number | null;
  readonly caloriesLogged: number;
  readonly proteinLogged: number;
  readonly meals: readonly LocalMeal[];
};

export type LocalCheckIn = {
  readonly id: string;
  readonly localDate: string;
  readonly status: string;
  readonly note: string | null;
  readonly triggeredRebuild: boolean;
  readonly createdAt: number;
};

export type LocalProgressPhoto = {
  readonly id: string;
  readonly localUri: string;
  readonly pose: string;
  readonly takenAt: number;
  readonly note: string | null;
};

export type LocalWeightLog = {
  readonly id: string;
  readonly kg: number;
  readonly loggedAt: number;
};
