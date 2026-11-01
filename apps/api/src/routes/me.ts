import {
  UpdatePreferencesBodySchema,
  type DeleteMeResponse,
  type MeResponse,
  type OnboardingPreferences,
  type OnboardingProfile,
  type UpdatePreferencesResponse,
} from "@mirra/contracts";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../db";
import { accounts, entitlements, preferences, profiles, users } from "../db/schema";
import type { MirraEnv } from "../env";
import { msToUnix } from "../lib/dates";
import { getObjectStore } from "../lib/object-store";
import { toPreferencesOut } from "../lib/prefs-out";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { deleteAccount } from "../services/account-deletion";

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
  const linked = await db
    .select({ providerId: accounts.providerId })
    .from(accounts)
    .where(eq(accounts.userId, userId));

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

  const prefsOut: OnboardingPreferences | null = prefs ? toPreferencesOut(prefs) : null;

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
    accounts: linked.map((a) => ({ providerId: a.providerId })),
  };
  return c.json(body);
});

/** Hard-delete the signed-in account: R2 media, D1 rows, auth sessions. userId comes from the session only. */
meRoutes.delete("/v1/me", requireAuth, async (c) => {
  const userId = c.get("userId");
  await deleteAccount(createDb(c.env.DB), getObjectStore(c.env), userId);
  const body: DeleteMeResponse = { ok: true };
  return c.json(body);
});

/** Edit food prefs + trainer persona after onboarding. Meal-plan generate/swap/rebalance read these from D1. */
meRoutes.patch("/v1/me/preferences", requireAuth, async (c) => {
  const body = parseBody(UpdatePreferencesBodySchema, await c.req.json());
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const patch = {
    ...(body.dietTags !== undefined && { dietTagsJson: JSON.stringify(body.dietTags) }),
    ...(body.foodsAvoid !== undefined && { foodsAvoid: body.foodsAvoid || null }),
    ...(body.cuisineStyles !== undefined && {
      cuisineJson: JSON.stringify([...new Set(body.cuisineStyles)]),
    }),
    ...(body.trainerPersona !== undefined && { trainerPersona: body.trainerPersona }),
    ...(body.trainingLocation !== undefined && { trainingLocation: body.trainingLocation }),
    updatedAt: new Date(),
  };

  const [row] = await db
    .insert(preferences)
    .values({ userId, primaryGoal: "consistency", experience: "new", ...patch })
    .onConflictDoUpdate({ target: preferences.userId, set: patch })
    .returning();

  const out: UpdatePreferencesResponse = { preferences: toPreferencesOut(row!) };
  return c.json(out);
});
