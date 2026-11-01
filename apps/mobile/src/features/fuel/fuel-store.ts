import { create } from "zustand";

import { getFuelToday as getLocalFuel, logMeal } from "@/db";
import {
  createMeal,
  getFuelToday as getApiFuel,
  logWater,
  type MealAnalysisFields,
} from "@/lib/api";
import { errorMessage, logger } from "@/lib/logger";
import { formatTime, slotKey, tipAfterLog, todayIso } from "./fuel-helpers";

export type LocalMeal = {
  readonly id: string;
  readonly name: string;
  readonly calories: number;
  readonly proteinG: number;
  readonly localDate: string;
  readonly slot: string;
  readonly time: string;
  /** Unix ms; absent on optimistic rows. */
  readonly eatenAt?: number;
  readonly source: "manual" | "snap" | "api" | "describe";
};

type FuelState = {
  readonly meals: readonly LocalMeal[];
  readonly target: number;
  readonly proteinTarget: number | null;
  readonly proteinLogged: number;
  readonly carbsTarget: number | null;
  readonly carbsLogged: number;
  readonly fatTarget: number | null;
  readonly fatLogged: number;
  readonly waterLoggedMl: number;
  readonly waterTargetMl: number;
  readonly tip: string | null;
  readonly loading: boolean;
  readonly hydrate: () => Promise<void>;
  readonly addMeal: (input: {
    name: string;
    calories: number;
    proteinG: number;
    slot: string;
    source?: LocalMeal["source"];
    carbsG?: number;
    fatG?: number;
    /** Uploaded meal photo (`POST /v1/media/upload-url`). */
    mediaId?: string | null;
    /** Vision analysis (ingredients, micros, warnings) saved with the meal. */
    analysis?: MealAnalysisFields;
  }) => Promise<LocalMeal>;
  readonly clearTip: () => void;
  /** Optimistic `+ml`, persisted via `POST /v1/water`; reverts on failure. */
  readonly addWater: (ml: number) => Promise<void>;
};

export const DEFAULT_WATER_TARGET_ML = 3000;

export const useFuelStore = create<FuelState>((set, get) => ({
  meals: [],
  target: 0,
  proteinTarget: null,
  proteinLogged: 0,
  carbsTarget: null,
  carbsLogged: 0,
  fatTarget: null,
  fatLogged: 0,
  waterLoggedMl: 0,
  waterTargetMl: DEFAULT_WATER_TARGET_ML,
  tip: null,
  loading: false,

  clearTip: () => set({ tip: null }),

  addWater: async (ml) => {
    set((s) => ({ waterLoggedMl: s.waterLoggedMl + ml }));
    try {
      const res = await logWater({ ml, localDate: todayIso() });
      if (res?.hydration) {
        set({
          waterLoggedMl: res.hydration.loggedMl,
          waterTargetMl: res.hydration.targetMl || DEFAULT_WATER_TARGET_ML,
        });
      }
    } catch (err) {
      logger.warn("fuel.water_failed", { message: errorMessage(err) });
      set((s) => ({
        waterLoggedMl: Math.max(0, s.waterLoggedMl - ml),
        tip: "Couldn't save water — try again.",
      }));
    }
  },

  hydrate: async () => {
    set({ loading: true });
    try {
      const fuel = await getApiFuel();
      const meals: LocalMeal[] = fuel.meals.map((m) => ({
        id: m.id,
        name: m.name,
        calories: m.kcal,
        proteinG: m.proteinG,
        localDate: fuel.date,
        slot: m.mealSlot,
        time: formatTime(m.eatenAt),
        eatenAt: m.eatenAt,
        source: "api" as const,
      }));
      set({
        meals,
        target: fuel.targets.kcal || get().target,
        proteinTarget: fuel.targets.proteinG || get().proteinTarget,
        proteinLogged: fuel.logged.proteinG,
        carbsTarget: fuel.targets.carbsG || null,
        carbsLogged: fuel.logged.carbsG,
        fatTarget: fuel.targets.fatG || null,
        fatLogged: fuel.logged.fatG,
        ...(fuel.hydration
          ? {
              waterLoggedMl: fuel.hydration.loggedMl,
              waterTargetMl: fuel.hydration.targetMl || DEFAULT_WATER_TARGET_ML,
            }
          : {}),
        loading: false,
      });
      return;
    } catch (err) {
      logger.warn("fuel.hydrate.api_failed", { message: errorMessage(err) });
    }

    try {
      const fuel = await getLocalFuel();
      const meals: LocalMeal[] = fuel.meals.map((m) => ({
        id: m.id,
        name: m.name,
        calories: m.kcal,
        proteinG: m.proteinG,
        localDate: fuel.date,
        slot: m.mealSlot,
        time: formatTime(m.eatenAt),
        eatenAt: m.eatenAt,
        source: "manual" as const,
      }));
      set({
        meals,
        target: fuel.caloriesTarget ?? get().target,
        proteinTarget: fuel.proteinTarget,
        proteinLogged: meals.reduce((s, m) => s + m.proteinG, 0),
        loading: false,
      });
    } catch (err) {
      logger.error("fuel.hydrate.local_failed", { message: errorMessage(err) });
      set({ loading: false });
    }
  },

  addMeal: async ({
    name,
    calories,
    proteinG,
    slot,
    source = "manual",
    carbsG,
    fatG,
    mediaId,
    analysis,
  }) => {
    const localDate = todayIso();
    const saved = await logMeal({
      name,
      kcal: calories,
      proteinG,
      mealSlot: slotKey(slot),
      localDate,
    });
    const local: LocalMeal = {
      id: saved.id,
      name: saved.name,
      calories: saved.kcal,
      proteinG: saved.proteinG,
      localDate,
      slot,
      time: formatTime(saved.eatenAt),
      eatenAt: saved.eatenAt,
      source,
    };
    set((s) => {
      const meals = [local, ...s.meals];
      return {
        meals,
        proteinLogged: meals.reduce((sum, m) => sum + m.proteinG, 0),
        carbsLogged: s.carbsLogged + (carbsG ?? 0),
        fatLogged: s.fatLogged + (fatG ?? 0),
        tip: tipAfterLog(s.target, s.proteinTarget, meals),
      };
    });
    try {
      const remote = await createMeal(
        {
          name,
          mealSlot: slotKey(slot),
          kcal: Math.round(calories),
          proteinG,
          carbsG,
          fatG,
          eatenAt: saved.eatenAt,
          ...(mediaId ? { mediaId } : {}),
          ...analysis,
        },
        local.id,
      );
      set((s) => ({
        meals: s.meals.map((m) =>
          m.id === local.id ? { ...m, id: remote.id, source: "api" as const } : m,
        ),
      }));
      await get().hydrate();
      return { ...local, id: remote.id, source: "api" };
    } catch (err) {
      logger.error("fuel.create_meal_failed", {
        message: errorMessage(err),
        mealSlot: slotKey(slot),
        kcal: Math.round(calories),
      });
      return local;
    }
  },
}));

export const selectLoggedKcal = (meals: readonly LocalMeal[]) =>
  meals.reduce((sum, m) => sum + m.calories, 0);
