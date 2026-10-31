import { z } from "zod";

import { DEFAULT_TRAINER_PERSONA, TrainerPersonaSchema } from "./trainer-persona";

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

export const CUISINE_STYLE_IDS = [
  "indian",
  "american",
  "chinese",
  "japanese",
  "mediterranean",
  "mexican",
  "middle_eastern",
  "korean",
  "thai",
  "other",
] as const;
export const CuisineStyleSchema = z.enum(CUISINE_STYLE_IDS);

/** Visual physique target — shapes volume, split bias, and macro tone. */
export const PHYSIQUE_TARGET_IDS = [
  "lean_cut",
  "athletic",
  "muscular",
  "toned",
  "strong",
] as const;
export const PhysiqueTargetSchema = z.enum(PHYSIQUE_TARGET_IDS);

export const OnboardingPreferencesSchema = z.object({
  primaryGoal: PrimaryGoalSchema,
  experience: ExperienceSchema,
  equipment: z.array(z.string()).default([]),
  trainDays: z.array(TrainDaySchema).default([]),
  sessionMinutes: SessionMinutesSchema,
  dietTags: z.array(z.string()).default([]),
  foodsAvoid: z.string().nullable().optional(),
  /** Required (min 1): cuisines the user eats; meal catalog is filtered to these + universal foods. */
  cuisineStyles: z.array(CuisineStyleSchema).min(1),
  units: UnitsSchema.default("metric"),
  trainerPersona: TrainerPersonaSchema.default(DEFAULT_TRAINER_PERSONA),
  /** Optional look the user wants; null/omit when skipped. */
  physiqueTarget: PhysiqueTargetSchema.nullable().optional(),
  /** Free-text daily routine / likes / constraints for the coach. Max 2000. */
  lifestyleNotes: z.string().max(2000).nullable().optional(),
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
export type CuisineStyle = z.infer<typeof CuisineStyleSchema>;
export type PhysiqueTarget = z.infer<typeof PhysiqueTargetSchema>;
export type Units = z.infer<typeof UnitsSchema>;
export type OnboardingPreferences = z.infer<typeof OnboardingPreferencesSchema>;
export type OnboardingProfile = z.infer<typeof OnboardingProfileSchema>;
export type OnboardingBody = z.infer<typeof OnboardingBodySchema>;
export type OnboardingResponse = z.infer<typeof OnboardingResponseSchema>;
