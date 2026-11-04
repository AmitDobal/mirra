import { OnboardingBodySchema } from "@mirra/contracts";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../db";
import { mediaObjects, preferences, profiles } from "../db/schema";
import type { MirraEnv } from "../env";
import { ApiError } from "../lib/errors";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { startGoalFromOnboardingSafe } from "../services/goal-refresh";

export const onboardingRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

/**
 * Soft-validate the mirror media: must be an uploaded `mirror` row owned by this user.
 * Anything else (guest-owned id after sign-in, bad id, not uploaded) is dropped, never a 4xx,
 * so a stale id cannot brick the onboarding funnel.
 */
const resolveMirrorMediaId = async (
  db: ReturnType<typeof createDb>,
  userId: string,
  mediaId: string | null | undefined,
): Promise<string | null> => {
  if (!mediaId) return null;
  const [row] = await db
    .select({ id: mediaObjects.id, bytes: mediaObjects.bytes })
    .from(mediaObjects)
    .where(
      and(
        eq(mediaObjects.id, mediaId),
        eq(mediaObjects.userId, userId),
        eq(mediaObjects.kind, "mirror"),
      ),
    )
    .limit(1);
  return row?.bytes ? row.id : null;
};

/**
 * AMI-177: a completed profile is never silently overwritten. A cold-start glitch once
 * replayed the funnel with store defaults and wiped a paid user's answers + plan.
 * Re-running the quiz (pre-paywall "edit answers") must opt in with `reset: true`.
 */
export const decideOnboardingWrite = (opts: {
  readonly alreadyCompleted: boolean;
  readonly reset: boolean | undefined;
}): "write" | "reject" =>
  opts.alreadyCompleted && opts.reset !== true ? "reject" : "write";

onboardingRoutes.put("/v1/onboarding", requireAuth, async (c) => {
  const body = parseBody(OnboardingBodySchema, await c.req.json());
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const now = new Date();

  const [existing] = await db
    .select({ completedAt: profiles.onboardingCompletedAt })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  const decision = decideOnboardingWrite({
    alreadyCompleted: existing?.completedAt != null,
    reset: body.reset,
  });
  if (decision === "reject") {
    throw new ApiError(
      "already_onboarded",
      "Onboarding already completed. Send reset: true to replace your answers.",
      409,
    );
  }
  const mirrorMediaId = await resolveMirrorMediaId(db, userId, body.profile.mirrorMediaId);

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
      mirrorMediaId,
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
        // Omitted id keeps any previously attached selfie; a valid id replaces it.
        ...(mirrorMediaId ? { mirrorMediaId } : {}),
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
      cuisineJson: JSON.stringify(body.preferences.cuisineStyles),
      units: body.preferences.units,
      trainerPersona: body.preferences.trainerPersona,
      physiqueTarget: body.preferences.physiqueTarget ?? null,
      lifestyleNotes: body.preferences.lifestyleNotes?.trim() || null,
      trainingLocation: body.preferences.trainingLocation ?? "gym",
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
        cuisineJson: JSON.stringify(body.preferences.cuisineStyles),
        units: body.preferences.units,
        trainerPersona: body.preferences.trainerPersona,
        physiqueTarget: body.preferences.physiqueTarget ?? null,
        lifestyleNotes: body.preferences.lifestyleNotes?.trim() || null,
        trainingLocation: body.preferences.trainingLocation ?? "gym",
        updatedAt: now,
      },
    });

  // AMI-179: goal plan v1 (or a new version on reset) with the S43 commitment. Never fails the write.
  await startGoalFromOnboardingSafe(db, userId, body.commitment?.committedAt ?? null, now);

  return c.json({ ok: true as const, onboardingCompleted: true });
});
