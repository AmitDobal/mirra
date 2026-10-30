import { z } from "zod";

export const SexSchema = z.enum(["female", "male", "unspecified"]);
export const PaceSchema = z.enum(["steady", "aggressive"]);
export const PrimaryGoalSchema = z.enum([
  "lose_fat",
  "build_muscle",
  "recomp",
  "consistency",
  "performance",
]);
export const ExperienceSchema = z.enum(["new", "months", "y1_2", "y3_plus"]);
export const SessionMinutesSchema = z.union([
  z.literal(20),
  z.literal(30),
  z.literal(45),
  z.literal(60),
]);
export const UnitsSchema = z.enum(["metric", "imperial"]);
export const TrainDaySchema = z.number().int().min(1).max(7);

export const OnboardingPreferencesSchema = z.object({
  primaryGoal: PrimaryGoalSchema,
  experience: ExperienceSchema,
  equipment: z.array(z.string()).default([]),
  trainDays: z.array(TrainDaySchema).default([]),
  sessionMinutes: SessionMinutesSchema,
  dietTags: z.array(z.string()).default([]),
  foodsAvoid: z.string().nullable().optional(),
  units: UnitsSchema.default("metric"),
});

export const OnboardingProfileSchema = z.object({
  sex: SexSchema.nullable().optional(),
  ageYears: z.number().int().min(13).max(100).nullable().optional(),
  heightCm: z.number().positive().nullable().optional(),
  weightKg: z.number().positive().nullable().optional(),
  goalWeightKg: z.number().positive().nullable().optional(),
  pace: PaceSchema.nullable().optional(),
  timezone: z.string().min(1),
});

export const OnboardingBodySchema = z.object({
  profile: OnboardingProfileSchema,
  preferences: OnboardingPreferencesSchema,
});

export const OnboardingResponseSchema = z.object({
  ok: z.literal(true),
  onboardingCompleted: z.boolean(),
});

export type Sex = z.infer<typeof SexSchema>;
export type Pace = z.infer<typeof PaceSchema>;
export type PrimaryGoal = z.infer<typeof PrimaryGoalSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Units = z.infer<typeof UnitsSchema>;
export type OnboardingPreferences = z.infer<typeof OnboardingPreferencesSchema>;
export type OnboardingProfile = z.infer<typeof OnboardingProfileSchema>;
export type OnboardingBody = z.infer<typeof OnboardingBodySchema>;
export type OnboardingResponse = z.infer<typeof OnboardingResponseSchema>;
