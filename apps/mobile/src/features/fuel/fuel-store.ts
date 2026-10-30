import { create } from "zustand";

import { getFuelToday, logMeal } from "@/db";
import { createMeal } from "@/lib/api";

export type LocalMeal = {
  readonly id: string;
  readonly name: string;
  readonly calories: number;
  readonly proteinG: number;
  readonly localDate: string;
  readonly slot: string;
  readonly time: string;
  readonly source: "manual" | "snap" | "api";
};

type FuelState = {
  readonly meals: readonly LocalMeal[];
  readonly target: number;
  readonly proteinTarget: number | null;
  readonly loading: boolean;
  readonly hydrate: () => Promise<void>;
  readonly addMeal: (input: {
    name: string;
    calories: number;
    proteinG: number;
    slot: string;
    source?: LocalMeal["source"];
  }) => Promise<LocalMeal>;
  readonly snapPlaceholder: () => Promise<LocalMeal>;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const formatTime = (ms?: number) =>
  new Date(ms ?? Date.now()).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const slotKey = (slot: string) => {
  const s = slot.toLowerCase();
  if (s === "breakfast" || s === "lunch" || s === "dinner" || s === "snack") {
    return s as "breakfast" | "lunch" | "dinner" | "snack";
  }
  return "snack" as const;
};

export const useFuelStore = create<FuelState>((set, get) => ({
  meals: [],
  target: 0,
  proteinTarget: null,
  loading: false,

  hydrate: async () => {
    set({ loading: true });
    try {
      const fuel = await getFuelToday();
      const meals: LocalMeal[] = fuel.meals.map((m) => ({
        id: m.id,
        name: m.name,
        calories: m.kcal,
        proteinG: m.proteinG,
        localDate: fuel.date,
        slot: m.mealSlot,
        time: formatTime(m.eatenAt),
        source: "manual" as const,
      }));
      set({
        meals,
        target: fuel.caloriesTarget ?? get().target,
        proteinTarget: fuel.proteinTarget,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  addMeal: async ({ name, calories, proteinG, slot, source = "manual" }) => {
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
      source,
    };
    set((s) => ({ meals: [local, ...s.meals] }));
    try {
      const remote = await createMeal(
        { name, calories, proteinG, localDate },
        local.id,
      );
      set((s) => ({
        meals: s.meals.map((m) =>
          m.id === local.id ? { ...m, id: remote.id, source: "api" as const } : m,
        ),
      }));
      return { ...local, id: remote.id, source: "api" };
    } catch {
      return local;
    }
  },

  snapPlaceholder: async () =>
    get().addMeal({
      name: "Snap meal (pending review)",
      calories: 420,
      proteinG: 28,
      slot: "Snap",
      source: "snap",
    }),
}));

export const selectLoggedKcal = (meals: readonly LocalMeal[]) =>
  meals.reduce((sum, m) => sum + m.calories, 0);
