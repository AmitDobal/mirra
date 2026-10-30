import { OnboardingBodySchema } from "@mirra/contracts";
import { Hono } from "hono";

import { createDb } from "../db";
import { preferences, profiles } from "../db/schema";
import type { MirraEnv } from "../env";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";

export const onboardingRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

onboardingRoutes.put("/v1/onboarding", requireAuth, async (c) => {
  const body = parseBody(OnboardingBodySchema, await c.req.json());
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const now = new Date();

  await db
    .insert(profiles)
    .values({
      userId,
      sex: body.profile.sex ?? null,
      ageYears: body.profile.ageYears ?? null,
      heightCm: body.profile.heightCm ?? null,
      weightKg: body.profile.weightKg ?? null,
      goalWeightKg: body.profile.goalWeightKg ?? null,
      pace: body.profile.pace ?? null,
      timezone: body.profile.timezone,
      onboardingCompletedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        sex: body.profile.sex ?? null,
        ageYears: body.profile.ageYears ?? null,
        heightCm: body.profile.heightCm ?? null,
        weightKg: body.profile.weightKg ?? null,
        goalWeightKg: body.profile.goalWeightKg ?? null,
        pace: body.profile.pace ?? null,
        timezone: body.profile.timezone,
        onboardingCompletedAt: now,
        updatedAt: now,
      },
    });

  await db
    .insert(preferences)
    .values({
      userId,
      primaryGoal: body.preferences.primaryGoal,
      experience: body.preferences.experience,
      equipmentJson: JSON.stringify(body.preferences.equipment),
      trainDaysJson: JSON.stringify(body.preferences.trainDays),
      sessionMinutes: body.preferences.sessionMinutes,
      dietTagsJson: JSON.stringify(body.preferences.dietTags),
      foodsAvoid: body.preferences.foodsAvoid ?? null,
      units: body.preferences.units,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: preferences.userId,
      set: {
        primaryGoal: body.preferences.primaryGoal,
        experience: body.preferences.experience,
        equipmentJson: JSON.stringify(body.preferences.equipment),
        trainDaysJson: JSON.stringify(body.preferences.trainDays),
        sessionMinutes: body.preferences.sessionMinutes,
        dietTagsJson: JSON.stringify(body.preferences.dietTags),
        foodsAvoid: body.preferences.foodsAvoid ?? null,
        units: body.preferences.units,
        updatedAt: now,
      },
    });

  return c.json({ ok: true as const, onboardingCompleted: true });
});
