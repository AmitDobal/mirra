import { toTrainerPersonaId, type OnboardingPreferences } from "@mirra/contracts";

import type { preferences } from "../db/schema";
import { parseJson } from "./json";

type PrefsRow = typeof preferences.$inferSelect;

/** DB preferences row → API shape (shared by GET /v1/me and PATCH /v1/me/preferences). */
export const toPreferencesOut = (prefs: PrefsRow): OnboardingPreferences => ({
  primaryGoal: prefs.primaryGoal as OnboardingPreferences["primaryGoal"],
  experience: prefs.experience as OnboardingPreferences["experience"],
  equipment: parseJson<string[]>(prefs.equipmentJson, []),
  trainDays: parseJson<number[]>(prefs.trainDaysJson, []),
  sessionMinutes: prefs.sessionMinutes as OnboardingPreferences["sessionMinutes"],
  dietTags: parseJson<string[]>(prefs.dietTagsJson, []),
  foodsAvoid: prefs.foodsAvoid,
  cuisineStyles: parseJson<OnboardingPreferences["cuisineStyles"]>(prefs.cuisineJson, []),
  units: prefs.units as OnboardingPreferences["units"],
  trainerPersona: toTrainerPersonaId(prefs.trainerPersona),
  physiqueTarget: (prefs.physiqueTarget as OnboardingPreferences["physiqueTarget"]) ?? null,
  lifestyleNotes: prefs.lifestyleNotes ?? null,
});
