import { apiFetch } from "./client";

/** Mirrors contracts `OnboardingPreferences` (food fields only matter here). */
export type FoodPrefs = {
  readonly dietTags: readonly string[];
  readonly foodsAvoid: string | null;
  /** Empty until the user picks cuisines (legacy accounts). */
  readonly cuisineStyles: readonly string[];
};

export type UpdateFoodPrefsBody = {
  readonly dietTags?: readonly string[];
  readonly foodsAvoid?: string | null;
  readonly cuisineStyles?: readonly string[];
};

/** GET /v1/me — `preferences` is null until onboarding (or a PATCH) writes the row. */
export const getMyFoodPrefs = async (): Promise<FoodPrefs | null> => {
  const me = await apiFetch<{ preferences: Partial<FoodPrefs> | null }>("/v1/me");
  if (!me.preferences) return null;
  return {
    dietTags: me.preferences.dietTags ?? [],
    foodsAvoid: me.preferences.foodsAvoid ?? null,
    cuisineStyles: me.preferences.cuisineStyles ?? [],
  };
};

/** GET /v1/me trainer persona; null when no preferences row yet. */
export const getMyTrainerPersona = async (): Promise<string | null> => {
  const me = await apiFetch<{ preferences: { trainerPersona?: string } | null }>("/v1/me");
  return me.preferences?.trainerPersona ?? null;
};

/** PATCH /v1/me/preferences with only the trainer persona. */
export const patchTrainerPersona = (trainerPersona: string) =>
  apiFetch<{ preferences: { trainerPersona: string } }>("/v1/me/preferences", {
    method: "PATCH",
    body: { trainerPersona },
  });

/** PATCH /v1/me/preferences — meal plans read these from the DB on every generate. */
export const patchFoodPrefs = (body: UpdateFoodPrefsBody) =>
  apiFetch<{ preferences: FoodPrefs }>("/v1/me/preferences", { method: "PATCH", body });
