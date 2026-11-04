import { z } from "zod";

import {
  ExperienceSchema,
  OnboardingPreferencesSchema,
  OnboardingProfileSchema,
  PaceSchema,
  PhysiqueTargetSchema,
  PrimaryGoalSchema,
  SessionMinutesSchema,
  SexSchema,
  TrainDaySchema,
  UnitsSchema,
} from "./onboarding";
import { WEIGHT_KG_MAX, WEIGHT_KG_MIN } from "./weight";

/** Editable height range (cm) — 4'0" to 8'2". */
export const HEIGHT_CM_MIN = 120;
export const HEIGHT_CM_MAX = 250;

/**
 * PATCH /v1/me/profile — partial edit of onboarding answers after onboarding (AMI-176).
 * Only provided keys change; nothing else is reset and no plan is regenerated.
 * Body weight is NOT here: log it via POST /v1/weight (mirrors onto the profile).
 */
export const UpdateProfileBodySchema = z
  .object({
    sex: SexSchema.optional(),
    ageYears: z.number().int().min(13).max(100).optional(),
    heightCm: z.number().min(HEIGHT_CM_MIN).max(HEIGHT_CM_MAX).optional(),
    goalWeightKg: z.number().min(WEIGHT_KG_MIN).max(WEIGHT_KG_MAX).nullable().optional(),
    pace: PaceSchema.optional(),
    units: UnitsSchema.optional(),
    primaryGoal: PrimaryGoalSchema.optional(),
    physiqueTarget: PhysiqueTargetSchema.nullable().optional(),
    experience: ExperienceSchema.optional(),
    lifestyleNotes: z.string().trim().max(2000).nullable().optional(),
    trainDays: z
      .array(TrainDaySchema)
      .min(1)
      .max(7)
      .refine((d) => new Set(d).size === d.length, "trainDays must be unique")
      .optional(),
    sessionMinutes: SessionMinutesSchema.optional(),
    equipment: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    mealsPerDay: z.number().int().min(1).max(4).nullable().optional(),
  })
  .strict()
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Provide at least one profile field",
  });

export const UpdateProfileResponseSchema = z.object({
  profile: OnboardingProfileSchema,
  preferences: OnboardingPreferencesSchema,
});

/** Fields that change what the plan builds — the client offers a rebuild, never auto-runs it. */
export const PLAN_AFFECTING_FIELDS = [
  "trainDays",
  "sessionMinutes",
  "equipment",
  "primaryGoal",
  "experience",
  "mealsPerDay",
  "dietTags",
] as const;

export type UpdateProfileBody = z.infer<typeof UpdateProfileBodySchema>;
export type UpdateProfileResponse = z.infer<typeof UpdateProfileResponseSchema>;
