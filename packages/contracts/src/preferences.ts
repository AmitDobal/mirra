import { z } from "zod";

import { CuisineStyleSchema, OnboardingPreferencesSchema } from "./onboarding";
import { TrainerPersonaSchema } from "./trainer-persona";

/** PATCH /v1/me/preferences: food prefs + trainer persona; at least one field required. */
export const UpdatePreferencesBodySchema = z
  .object({
    dietTags: z.array(z.string().trim().min(1).max(32)).max(12).optional(),
    foodsAvoid: z.string().trim().max(200).nullable().optional(),
    cuisineStyles: z.array(CuisineStyleSchema).min(1).optional(),
    trainerPersona: TrainerPersonaSchema.optional(),
  })
  .refine(
    (v) =>
      v.dietTags !== undefined ||
      v.foodsAvoid !== undefined ||
      v.cuisineStyles !== undefined ||
      v.trainerPersona !== undefined,
    { message: "Provide dietTags, foodsAvoid, cuisineStyles or trainerPersona" },
  );

export const UpdatePreferencesResponseSchema = z.object({
  preferences: OnboardingPreferencesSchema,
});

export type UpdatePreferencesBody = z.infer<typeof UpdatePreferencesBodySchema>;
export type UpdatePreferencesResponse = z.infer<typeof UpdatePreferencesResponseSchema>;
