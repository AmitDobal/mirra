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

/** Thin Better Auth account link — `providerId` only (google | apple | credential…). */
export const MeAccountSchema = z.object({
  providerId: z.string().min(1),
});

export const MeEntitlementSchema = z.object({
  status: EntitlementStatusSchema,
  expiresAt: z.number().int().nullable(),
  productId: z.string().nullable(),
});

/** GET /v1/me — auth user + profile/prefs + entitlement + linked providers. */
export const MeResponseSchema = z.object({
  user: MeUserSchema,
  profile: OnboardingProfileSchema.nullable(),
  preferences: OnboardingPreferencesSchema.nullable(),
  entitlement: MeEntitlementSchema,
  onboardingCompleted: z.boolean(),
  /** Linked auth providers; empty when none (dev header users). */
  accounts: z.array(MeAccountSchema).default([]),
});

export type MeResponse = z.infer<typeof MeResponseSchema>;
export type MeUser = z.infer<typeof MeUserSchema>;
export type MeAccount = z.infer<typeof MeAccountSchema>;
export type EntitlementStatus = z.infer<typeof EntitlementStatusSchema>;
