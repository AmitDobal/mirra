import { apiFetch } from "./client";
import type { CreateMealBody, FuelTodayResponse, Meal } from "./types";

export type MealEstimateBody = {
  readonly imageDataUrl?: string;
  readonly description?: string;
};

export type MealEstimate = {
  readonly name: string;
  readonly kcal: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
  readonly confidence: number;
  readonly notes?: string;
  readonly source: "openai" | "heuristic";
};

export const getFuelToday = (date?: string) =>
  apiFetch<FuelTodayResponse>("/v1/fuel/today", {
    query: date ? { date } : undefined,
  });

/** Newest-first meal log history; pass `nextCursor` to continue. */
export const listMealsApi = (cursor?: string | null, limit = 20) =>
  apiFetch<{ items: Meal[]; nextCursor: string | null }>("/v1/meals", {
    query: { limit, cursor },
  });

export const createMeal = (body: CreateMealBody, idempotencyKey?: string) =>
  apiFetch<Meal>("/v1/meals", {
    method: "POST",
    body,
    idempotencyKey,
  });

export const estimateMeal = (body: MealEstimateBody) =>
  apiFetch<MealEstimate>("/v1/meals/estimate", {
    method: "POST",
    body,
  });

export const patchMeal = (id: string, body: Partial<CreateMealBody>) =>
  apiFetch<Meal>(`/v1/meals/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });

export const deleteMeal = (id: string) =>
  apiFetch<{ ok: true }>(`/v1/meals/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
