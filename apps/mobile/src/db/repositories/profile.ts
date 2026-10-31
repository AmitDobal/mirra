import { getDb } from "../client";
import { getLocalUserId, nowMs } from "../ids";
import { parseJson, toJson } from "../json";
import {
  OnboardingInputSchema,
  type LocalProfile,
  type OnboardingInput,
} from "../types";

type ProfileRow = {
  user_id: string;
  sex: string | null;
  age_years: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal_weight_kg: number | null;
  pace: string | null;
  timezone: string;
  onboarding_completed_at: number | null;
};

type PrefsRow = {
  primary_goal: string;
  experience: string;
  equipment_json: string;
  train_days_json: string;
  session_minutes: number;
  diet_tags_json: string;
  foods_avoid: string | null;
  units: string;
  trainer_persona: string | null;
  cuisine_json: string | null;
  physique_target: string | null;
  lifestyle_notes: string | null;
};

export const saveOnboarding = async (input: OnboardingInput): Promise<string> => {
  const data = OnboardingInputSchema.parse(input);
  const userId = data.userId ?? getLocalUserId();
  const db = await getDb();
  const ts = nowMs();
  const { profile: p, preferences: pref } = data;

  await db.runAsync(
    `INSERT INTO profiles (
      user_id, sex, age_years, height_cm, weight_kg, goal_weight_kg, pace,
      timezone, onboarding_completed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      sex=excluded.sex, age_years=excluded.age_years, height_cm=excluded.height_cm,
      weight_kg=excluded.weight_kg, goal_weight_kg=excluded.goal_weight_kg,
      pace=excluded.pace, timezone=excluded.timezone,
      onboarding_completed_at=excluded.onboarding_completed_at, updated_at=excluded.updated_at`,
    userId,
    p.sex ?? null,
    p.ageYears ?? null,
    p.heightCm ?? null,
    p.weightKg ?? null,
    p.goalWeightKg ?? null,
    p.pace ?? null,
    p.timezone,
    ts,
    ts,
    ts,
  );

  await db.runAsync(
    `INSERT INTO preferences (
      user_id, primary_goal, experience, equipment_json, train_days_json,
      session_minutes, diet_tags_json, foods_avoid, units, trainer_persona,
      cuisine_json, physique_target, lifestyle_notes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      primary_goal=excluded.primary_goal, experience=excluded.experience,
      equipment_json=excluded.equipment_json, train_days_json=excluded.train_days_json,
      session_minutes=excluded.session_minutes, diet_tags_json=excluded.diet_tags_json,
      foods_avoid=excluded.foods_avoid, units=excluded.units,
      trainer_persona=excluded.trainer_persona, cuisine_json=excluded.cuisine_json,
      physique_target=excluded.physique_target, lifestyle_notes=excluded.lifestyle_notes,
      updated_at=excluded.updated_at`,
    userId,
    pref.primaryGoal,
    pref.experience,
    toJson(pref.equipment ?? []),
    toJson(pref.trainDays ?? [1, 3, 5]),
    pref.sessionMinutes,
    toJson(pref.dietTags ?? []),
    pref.foodsAvoid ?? null,
    pref.units ?? "metric",
    pref.trainerPersona ?? "drill",
    toJson(pref.cuisineStyles ?? []),
    pref.physiqueTarget ?? null,
    pref.lifestyleNotes?.trim() || null,
    ts,
  );

  return userId;
};

/** Update only the trainer persona on the local preferences row (no-op without a row). */
export const setLocalTrainerPersona = async (
  persona: string,
  userId: string = getLocalUserId(),
): Promise<void> => {
  const db = await getDb();
  await db.runAsync(
    "UPDATE preferences SET trainer_persona = ?, updated_at = ? WHERE user_id = ?",
    persona,
    nowMs(),
    userId,
  );
};

export const getProfile = async (
  userId: string = getLocalUserId(),
): Promise<LocalProfile | null> => {
  const db = await getDb();
  const profile = await db.getFirstAsync<ProfileRow>(
    "SELECT * FROM profiles WHERE user_id = ?",
    userId,
  );
  if (!profile) return null;

  const prefs = await db.getFirstAsync<PrefsRow>(
    "SELECT * FROM preferences WHERE user_id = ?",
    userId,
  );

  return {
    userId: profile.user_id,
    sex: profile.sex,
    ageYears: profile.age_years,
    heightCm: profile.height_cm,
    weightKg: profile.weight_kg,
    goalWeightKg: profile.goal_weight_kg,
    pace: profile.pace,
    timezone: profile.timezone,
    onboardingCompletedAt: profile.onboarding_completed_at,
    preferences: prefs
      ? {
          primaryGoal: prefs.primary_goal,
          experience: prefs.experience,
          equipment: parseJson(prefs.equipment_json, [] as string[]),
          trainDays: parseJson(prefs.train_days_json, [1, 3, 5] as number[]),
          sessionMinutes: prefs.session_minutes,
          dietTags: parseJson(prefs.diet_tags_json, [] as string[]),
          foodsAvoid: prefs.foods_avoid,
          units: prefs.units,
          trainerPersona: prefs.trainer_persona ?? "drill",
          cuisineStyles: parseJson(prefs.cuisine_json, [] as string[]),
          physiqueTarget: prefs.physique_target,
          lifestyleNotes: prefs.lifestyle_notes,
        }
      : null,
  };
};
