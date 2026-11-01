import { create } from "zustand";

import {
  createPlannedItem,
  deletePlannedItem,
  generateMealPlan,
  getTodayMealPlan,
  logPlannedMeal,
  rebalanceMealPlan,
  swapPlannedMeal,
  type CreatePlannedItemBody,
  type DayMealPlan,
  type PlannedMeal,
} from "@/lib/api";
import { errorMessage, logger } from "@/lib/logger";

import { canGenerateMealPlan } from "./meal-plan-gate";
import { useFuelStore, type LocalMeal } from "./fuel-store";
import { formatLocalTime } from "@/lib/datetime";
import { todayIso } from "./fuel-helpers";

type MealPlanState = {
  readonly plan: DayMealPlan | null;
  readonly loading: boolean;
  readonly generating: boolean;
  /** Planned meal id with an in-flight log/swap/rebalance call. */
  readonly busyId: string | null;
  readonly error: string | null;
  readonly hydrate: () => Promise<void>;
  readonly generate: (force?: boolean) => Promise<void>;
  /** First Fuel/Today after Google + funnel soft-finish — generate once if empty. */
  readonly ensureAfterOnboarding: () => Promise<void>;
  readonly log: (meal: PlannedMeal) => Promise<void>;
  readonly swap: (meal: PlannedMeal) => Promise<void>;
  readonly rebalance: (reason?: "off_plan_log" | "manual") => Promise<void>;
  /** User-authored planned meal for today (no AI). */
  readonly addItem: (body: Omit<CreatePlannedItemBody, "localDate">) => Promise<void>;
  readonly deleteItem: (meal: PlannedMeal) => Promise<void>;
};

/** A slot that still needs eating. */
export const isPlannedOpen = (meal: PlannedMeal) => meal.status === "planned";

export const selectHasOpenPlannedMeal = (s: Pick<MealPlanState, "plan">) =>
  Boolean(s.plan?.meals.some(isPlannedOpen));

const OFF_PLAN_KCAL_TOLERANCE = 0.2;

/** Off-plan = matches no open planned slot within ±20% kcal. */
export const isOffPlanKcal = (plan: DayMealPlan, kcal: number): boolean =>
  plan.meals.filter(isPlannedOpen).every(
    (m) => Math.abs(kcal - m.kcal) > m.kcal * OFF_PLAN_KCAL_TOLERANCE,
  );

/** Show the logged plan meal in Fuel immediately, before the API replies. */
const applyOptimisticLog = (meal: PlannedMeal, date: string) => {
  const now = Date.now();
  const local: LocalMeal = {
    id: `plan-${meal.id}`,
    name: meal.title,
    calories: meal.kcal,
    proteinG: Math.round(meal.proteinG),
    localDate: date,
    slot: meal.slot,
    time: formatLocalTime(now),
    eatenAt: now,
    source: "api",
  };
  useFuelStore.setState((s) => ({
    meals: [local, ...s.meals],
    proteinLogged: s.proteinLogged + local.proteinG,
    carbsLogged: s.carbsLogged + meal.carbsG,
    fatLogged: s.fatLogged + meal.fatG,
  }));
};

const replaceMeal = (plan: DayMealPlan, id: string, status: PlannedMeal["status"]): DayMealPlan => ({
  ...plan,
  meals: plan.meals.map((m) => (m.id === id ? { ...m, status } : m)),
});

export const useMealPlanStore = create<MealPlanState>((set, get) => ({
  plan: null,
  loading: false,
  generating: false,
  busyId: null,
  error: null,

  hydrate: async () => {
    set({ loading: true });
    try {
      const res = await getTodayMealPlan(todayIso());
      set({ plan: res.plan, loading: false, error: null });
    } catch (err) {
      logger.warn("meal_plan.hydrate_failed", { message: errorMessage(err) });
      set({ loading: false });
    }
  },

  generate: async (force) => {
    if (get().generating) return;
    if (!(await canGenerateMealPlan())) {
      logger.info("meal_plan.generate_deferred", { reason: "funnel_or_auth" });
      set({
        error: "Save your plan with Google first — then open Fuel to build meals.",
      });
      return;
    }
    set({ generating: true, error: null });
    try {
      const plan = await generateMealPlan({ date: todayIso(), force });
      set({ plan, generating: false });
    } catch (err) {
      logger.warn("meal_plan.generate_failed", { message: errorMessage(err) });
      set({ generating: false, error: "Couldn't build today's plan. Try again." });
    }
  },

  ensureAfterOnboarding: async () => {
    if (!(await canGenerateMealPlan())) return;
    if (get().plan || get().generating) return;
    await get().hydrate();
    if (get().plan || get().generating) return;
    await get().generate(false);
  },

  log: async (meal) => {
    const before = get().plan;
    if (!before || get().busyId) return;
    set({ busyId: meal.id, error: null, plan: replaceMeal(before, meal.id, "logged") });
    applyOptimisticLog(meal, before.date);
    try {
      const res = await logPlannedMeal(before.id, { mealItemId: meal.id });
      set({ plan: res.plan, busyId: null });
    } catch (err) {
      logger.warn("meal_plan.log_failed", { message: errorMessage(err) });
      set({ plan: before, busyId: null, error: "Couldn't log that meal. Try again." });
    }
    await useFuelStore.getState().hydrate();
  },

  swap: async (meal) => {
    const plan = get().plan;
    if (!plan || get().busyId) return;
    set({ busyId: meal.id, error: null });
    try {
      const next = await swapPlannedMeal(plan.id, meal.id);
      set({ plan: next, busyId: null });
    } catch (err) {
      logger.warn("meal_plan.swap_failed", { message: errorMessage(err) });
      set({ busyId: null, error: "Couldn't swap that meal. Try again." });
    }
  },

  rebalance: async (reason = "manual") => {
    const plan = get().plan;
    if (!plan || get().generating) return;
    set({ generating: true, error: null });
    try {
      const next = await rebalanceMealPlan(plan.id, reason);
      set({ plan: next, generating: false });
    } catch (err) {
      logger.warn("meal_plan.rebalance_failed", { message: errorMessage(err) });
      set({ generating: false, error: "Couldn't rebalance. Try again." });
    }
  },

  addItem: async (body) => {
    if (get().busyId) return;
    set({ busyId: "new", error: null });
    try {
      const res = await createPlannedItem({ ...body, localDate: todayIso() });
      set({ plan: res.plan, busyId: null });
    } catch (err) {
      logger.warn("meal_plan.add_item_failed", { message: errorMessage(err) });
      set({ busyId: null, error: "Couldn't add that item. Try again." });
    }
  },

  deleteItem: async (meal) => {
    const before = get().plan;
    if (!before || get().busyId) return;
    set({
      busyId: meal.id,
      error: null,
      plan: { ...before, meals: before.meals.filter((m) => m.id !== meal.id) },
    });
    try {
      const res = await deletePlannedItem(meal.id);
      set({ plan: res.plan, busyId: null });
    } catch (err) {
      logger.warn("meal_plan.delete_item_failed", { message: errorMessage(err) });
      set({ plan: before, busyId: null, error: "Couldn't remove that item. Try again." });
    }
  },
}));
