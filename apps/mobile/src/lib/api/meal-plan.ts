import { apiFetch } from "./client";
import type { MacroTotals, Meal, MealSlot } from "./types";

/** Mirrors contracts `meal-plan.ts` (`/v1/meal-plan/*`). */
export type PlannedItem = {
  readonly foodId: string;
  readonly name: string;
  readonly grams: number;
  readonly unitLabel: string;
  readonly unitQty: number;
  readonly kcal: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
};

export type PlannedMealStatus = "planned" | "logged" | "skipped";

export type PlannedMeal = {
  readonly id: string;
  readonly slot: MealSlot;
  readonly title: string;
  readonly items: readonly PlannedItem[];
  readonly kcal: number;
  readonly proteinG: number;
  readonly carbsG: number;
  readonly fatG: number;
  readonly status: PlannedMealStatus;
  readonly loggedMealId: string | null;
  readonly fit: "ok" | "approx";
};

export type DayMealPlan = {
  readonly id: string;
  readonly date: string;
  readonly targets: MacroTotals;
  readonly planned: MacroTotals;
  readonly logged: MacroTotals;
  readonly remaining: MacroTotals;
  readonly meals: readonly PlannedMeal[];
  readonly source: "openai" | "heuristic";
  readonly rebalancedAt: number | null;
};

export type LogPlannedMealResponse = {
  readonly plan: DayMealPlan;
  readonly meal: Meal;
};

const planPath = (planId: string, action: "log" | "swap" | "rebalance") =>
  `/v1/meal-plan/${encodeURIComponent(planId)}/${action}`;

export const getTodayMealPlan = (date?: string) =>
  apiFetch<{ plan: DayMealPlan | null }>("/v1/meal-plan/today", {
    query: date ? { date } : undefined,
  });

export const generateMealPlan = (body: { date?: string; force?: boolean } = {}) =>
  apiFetch<DayMealPlan>("/v1/meal-plan/generate", { method: "POST", body });

export const logPlannedMeal = (
  planId: string,
  body: { mealItemId: string; eatenAt?: number; mealId?: string },
) =>
  apiFetch<LogPlannedMealResponse>(planPath(planId, "log"), {
    method: "POST",
    body,
  });

export const swapPlannedMeal = (planId: string, mealItemId: string) =>
  apiFetch<DayMealPlan>(planPath(planId, "swap"), {
    method: "POST",
    body: { mealItemId },
  });

export const rebalanceMealPlan = (
  planId: string,
  reason: "off_plan_log" | "manual" = "manual",
) =>
  apiFetch<DayMealPlan>(planPath(planId, "rebalance"), {
    method: "POST",
    body: { reason },
  });

/** Mirrors contracts `CreateMealPlanItemBodySchema` — user-authored, no AI. */
export type CreatePlannedItemBody = {
  readonly localDate: string;
  readonly slot: MealSlot;
  readonly name: string;
  readonly kcal: number;
  readonly proteinG: number;
  readonly carbsG?: number;
  readonly fatG?: number;
  readonly grams?: number;
};

export type PatchPlannedItemBody = Partial<Omit<CreatePlannedItemBody, "localDate">>;

export type PlannedItemResponse = {
  readonly plan: DayMealPlan;
  readonly item: PlannedMeal;
};

const itemPath = (itemId: string) => `/v1/meal-plan/items/${encodeURIComponent(itemId)}`;

export const createPlannedItem = (body: CreatePlannedItemBody) =>
  apiFetch<PlannedItemResponse>("/v1/meal-plan/items", { method: "POST", body });

export const patchPlannedItem = (itemId: string, body: PatchPlannedItemBody) =>
  apiFetch<PlannedItemResponse>(itemPath(itemId), { method: "PATCH", body });

export const deletePlannedItem = (itemId: string) =>
  apiFetch<{ plan: DayMealPlan }>(itemPath(itemId), { method: "DELETE" });
