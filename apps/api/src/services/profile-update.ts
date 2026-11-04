import type {
  OnboardingProfile,
  UpdateProfileBody,
  UpdateProfileResponse,
} from "@mirra/contracts";

import type { AppDB } from "../db";
import { preferences, profiles } from "../db/schema";
import { toPreferencesOut } from "../lib/prefs-out";

type ProfileRow = typeof profiles.$inferSelect;

const toProfileOut = (row: ProfileRow): OnboardingProfile => ({
  sex: (row.sex as OnboardingProfile["sex"]) ?? null,
  ageYears: row.ageYears,
  heightCm: row.heightCm,
  weightKg: row.weightKg,
  goalWeightKg: row.goalWeightKg,
  pace: (row.pace as OnboardingProfile["pace"]) ?? null,
  timezone: row.timezone,
});

const has = (b: UpdateProfileBody, k: keyof UpdateProfileBody): boolean => b[k] !== undefined;

/** Profile-table columns touched by this body (only keys present). */
const profilePatch = (b: UpdateProfileBody) => ({
  ...(has(b, "sex") && { sex: b.sex }),
  ...(has(b, "ageYears") && { ageYears: b.ageYears }),
  ...(has(b, "heightCm") && { heightCm: b.heightCm }),
  ...(has(b, "goalWeightKg") && { goalWeightKg: b.goalWeightKg ?? null }),
  ...(has(b, "pace") && { pace: b.pace }),
});

/** Preferences-table columns touched by this body (only keys present). */
const prefsPatch = (b: UpdateProfileBody) => ({
  ...(has(b, "units") && { units: b.units }),
  ...(has(b, "primaryGoal") && { primaryGoal: b.primaryGoal }),
  ...(has(b, "physiqueTarget") && { physiqueTarget: b.physiqueTarget ?? null }),
  ...(has(b, "experience") && { experience: b.experience }),
  ...(has(b, "lifestyleNotes") && { lifestyleNotes: b.lifestyleNotes || null }),
  ...(has(b, "trainDays") && {
    trainDaysJson: JSON.stringify([...(b.trainDays ?? [])].sort((x, y) => x - y)),
  }),
  ...(has(b, "sessionMinutes") && { sessionMinutes: b.sessionMinutes }),
  ...(has(b, "equipment") && { equipmentJson: JSON.stringify([...new Set(b.equipment)]) }),
  ...(has(b, "mealsPerDay") && { mealsPerDay: b.mealsPerDay ?? null }),
});

/**
 * Partial merge of onboarding answers for `userId` (taken from the session, never the body).
 * Untouched columns keep their values; plans are never regenerated here.
 */
export const updateProfile = async (
  db: AppDB,
  userId: string,
  body: UpdateProfileBody,
  now: Date = new Date(),
): Promise<UpdateProfileResponse> => {
  const profileSet = { ...profilePatch(body), updatedAt: now };
  const [profileRow] = await db
    .insert(profiles)
    .values({ userId, ...profileSet })
    .onConflictDoUpdate({ target: profiles.userId, set: profileSet })
    .returning();

  // Empty prefs patch still upserts (updatedAt only) so the response always has prefs.
  const prefsSet = { ...prefsPatch(body), updatedAt: now };
  const [prefsRow] = await db
    .insert(preferences)
    .values({ userId, primaryGoal: "consistency", experience: "new", ...prefsSet })
    .onConflictDoUpdate({ target: preferences.userId, set: prefsSet })
    .returning();

  return { profile: toProfileOut(profileRow!), preferences: toPreferencesOut(prefsRow!) };
};
