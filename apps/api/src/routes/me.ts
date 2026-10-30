import type { MeResponse, OnboardingPreferences, OnboardingProfile } from "@mirra/contracts";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../db";
import { entitlements, preferences, profiles, users } from "../db/schema";
import type { MirraEnv } from "../env";
import { msToUnix } from "../lib/dates";
import { parseJson } from "../lib/json";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";

export const meRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

meRoutes.get("/v1/me", requireAuth, async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const [prefs] = await db
    .select()
    .from(preferences)
    .where(eq(preferences.userId, userId))
    .limit(1);
  const [ent] = await db
    .select()
    .from(entitlements)
    .where(eq(entitlements.userId, userId))
    .limit(1);

  const profileOut: OnboardingProfile | null = profile
    ? {
        sex: (profile.sex as OnboardingProfile["sex"]) ?? null,
        ageYears: profile.ageYears,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        goalWeightKg: profile.goalWeightKg,
        pace: (profile.pace as OnboardingProfile["pace"]) ?? null,
        timezone: profile.timezone,
      }
    : null;

  const prefsOut: OnboardingPreferences | null = prefs
    ? {
        primaryGoal: prefs.primaryGoal as OnboardingPreferences["primaryGoal"],
        experience: prefs.experience as OnboardingPreferences["experience"],
        equipment: parseJson<string[]>(prefs.equipmentJson, []),
        trainDays: parseJson<number[]>(prefs.trainDaysJson, []),
        sessionMinutes: prefs.sessionMinutes as OnboardingPreferences["sessionMinutes"],
        dietTags: parseJson<string[]>(prefs.dietTagsJson, []),
        foodsAvoid: prefs.foodsAvoid,
        units: prefs.units as OnboardingPreferences["units"],
      }
    : null;

  const body: MeResponse = {
    user: {
      id: userId,
      email: user?.email ?? null,
      name: user?.name ?? null,
      image: user?.image ?? null,
    },
    profile: profileOut,
    preferences: prefsOut,
    entitlement: {
      status: (ent?.status as MeResponse["entitlement"]["status"]) ?? "none",
      expiresAt: msToUnix(ent?.expiresAt ?? null),
      productId: ent?.productId ?? null,
    },
    onboardingCompleted: Boolean(profile?.onboardingCompletedAt),
  };
  return c.json(body);
});
