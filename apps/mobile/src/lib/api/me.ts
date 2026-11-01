import { apiFetch } from "./client";

/** Mirrors contracts `MeUserSchema`. */
export type MeUser = {
  readonly id: string;
  readonly email: string | null;
  readonly name: string | null;
  readonly image: string | null;
};

/** Mirrors contracts `MeAccountSchema` — extensible for apple/email later. */
export type MeAccount = {
  readonly providerId: string;
};

export type MeEntitlement = {
  readonly status: "trial" | "active" | "expired" | "grace" | "none";
  readonly expiresAt: number | null;
  readonly productId: string | null;
};

/** Mirrors contracts `MeResponse` (profile/prefs typed loosely for callers that ignore them). */
export type MeResponse = {
  readonly user: MeUser;
  readonly profile: Record<string, unknown> | null;
  readonly preferences: Partial<FoodPrefs> & {
    readonly trainerPersona?: string;
    readonly primaryGoal?: string;
    readonly experience?: string;
    readonly sessionMinutes?: number;
    readonly trainingLocation?: "gym" | "home" | "hotel";
  } | null;
  readonly entitlement: MeEntitlement;
  readonly onboardingCompleted: boolean;
  readonly accounts: readonly MeAccount[];
};

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

/** Raw GET /v1/me — prefer `useMeStore.ensureMe()` so callers share one TTL cache. */
export const getMe = (): Promise<MeResponse> =>
  apiFetch<MeResponse>("/v1/me").then((me) => ({
    ...me,
    accounts: me.accounts ?? [],
  }));

/** Food prefs via me-store (deduped / TTL). Null until preferences exist. */
export const getMyFoodPrefs = async (): Promise<FoodPrefs | null> => {
  const { useMeStore } = await import("@/stores/me-store");
  const me = await useMeStore.getState().ensureMe();
  if (!me.preferences) return null;
  return {
    dietTags: me.preferences.dietTags ?? [],
    foodsAvoid: me.preferences.foodsAvoid ?? null,
    cuisineStyles: me.preferences.cuisineStyles ?? [],
  };
};

/** Trainer persona via me-store; null when no preferences row yet. */
export const getMyTrainerPersona = async (): Promise<string | null> => {
  const { useMeStore } = await import("@/stores/me-store");
  const me = await useMeStore.getState().ensureMe();
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

/** PATCH /v1/me/preferences — gym / home / hotel kit context for coach + plan. */
export const patchTrainingLocation = (trainingLocation: "gym" | "home" | "hotel") =>
  apiFetch<{ preferences: { trainingLocation: "gym" | "home" | "hotel" } }>(
    "/v1/me/preferences",
    { method: "PATCH", body: { trainingLocation } },
  );
