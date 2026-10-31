import type { preferences, profiles } from "../db/schema";
import { parseJson } from "../lib/json";

type PrefsRow = typeof preferences.$inferSelect;
type ProfileRow = typeof profiles.$inferSelect;

type PrefsOverrides = {
  trainDays?: number[];
  variant?: "recommended" | "alternate";
};

/**
 * Single source for the PlanGenerator `prefsJson` bundle.
 * Used by first-time generate and rebuild so both see equipment, cuisines, physique, lifestyle, etc.
 */
export const buildPlanPrefsJson = (prefs: PrefsRow, overrides: PrefsOverrides = {}): string =>
  JSON.stringify({
    primaryGoal: prefs.primaryGoal,
    experience: prefs.experience,
    trainDays: overrides.trainDays ?? parseJson<number[]>(prefs.trainDaysJson, []),
    sessionMinutes: prefs.sessionMinutes,
    equipment: parseJson<string[]>(prefs.equipmentJson, []),
    dietTags: parseJson<string[]>(prefs.dietTagsJson, []),
    foodsAvoid: prefs.foodsAvoid,
    cuisineStyles: parseJson<string[]>(prefs.cuisineJson, []),
    trainerPersona: prefs.trainerPersona,
    physiqueTarget: prefs.physiqueTarget,
    lifestyleNotes: prefs.lifestyleNotes,
    variant: overrides.variant ?? "recommended",
  });

/** Single source for the PlanGenerator `profileJson` bundle. */
export const buildPlanProfileJson = (profile: ProfileRow): string =>
  JSON.stringify({
    sex: profile.sex,
    ageYears: profile.ageYears,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    goalWeightKg: profile.goalWeightKg,
    pace: profile.pace,
  });
