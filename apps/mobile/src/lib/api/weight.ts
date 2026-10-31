import { apiFetch } from "./client";

export type WeightLogDto = {
  readonly id: string;
  readonly kg: number;
  readonly loggedAt: number;
};

export type LogWeightBody = {
  readonly kg: number;
  readonly loggedAt?: number;
};

export const WEIGHT_LIST_LIMIT = 90;

/** Newest-first weight history (server default 90, max 365). */
export const listWeightApi = (limit = WEIGHT_LIST_LIMIT) =>
  apiFetch<{ items: WeightLogDto[] }>("/v1/weight", { query: { limit } });

/** Also updates `profiles.weightKg` server-side. */
export const logWeightApi = (body: LogWeightBody) =>
  apiFetch<WeightLogDto>("/v1/weight", { method: "POST", body });

/** Goal weight from GET /v1/me (null until onboarding stores one). */
export const getMyGoalWeightKg = async (): Promise<number | null> => {
  const me = await apiFetch<{ profile: { goalWeightKg?: number | null } | null }>("/v1/me");
  return me.profile?.goalWeightKg ?? null;
};
