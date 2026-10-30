import { apiFetch } from "./client";
import type { CreateMealBody, FuelTodayResponse, Meal } from "./types";

export const getFuelToday = (date?: string) =>
  apiFetch<FuelTodayResponse>("/v1/fuel/today", {
    query: date ? { date } : undefined,
  });

export const createMeal = (body: CreateMealBody, idempotencyKey?: string) =>
  apiFetch<Meal>("/v1/meals", {
    method: "POST",
    body,
    idempotencyKey,
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
