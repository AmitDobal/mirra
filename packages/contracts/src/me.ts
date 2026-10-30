import { z } from "zod";

import { OnboardingPreferencesSchema, OnboardingProfileSchema } from "./onboarding";

export const EntitlementStatusSchema = z.enum([
  "trial",
  "active",
  "expired",
  "grace",
  "none",
]);

export const MeUserSchema = z.object({
  id: z.string(),
  email: z.string().email().nullable(),
  name: z.string().nullable(),
  image: z.string().nullable(),
});

export const MeEntitlementSchema = z.object({
  status: EntitlementStatusSchema,
  expiresAt: z.number().int().nullable(),
  productId: z.string().nullable(),
});

/** Stub shape for GET /v1/me — filled once auth + profile land. */
export const MeResponseSchema = z.object({
  user: MeUserSchema,
  profile: OnboardingProfileSchema.nullable(),
  preferences: OnboardingPreferencesSchema.nullable(),
  entitlement: MeEntitlementSchema,
  onboardingCompleted: z.boolean(),
});

export type MeResponse = z.infer<typeof MeResponseSchema>;
export type EntitlementStatus = z.infer<typeof EntitlementStatusSchema>;
