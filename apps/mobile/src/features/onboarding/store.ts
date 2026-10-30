import { create } from "zustand";

import type {
  DietId,
  EquipmentId,
  ExperienceId,
  GoalId,
  HeightUnit,
  OnboardingAnswers,
  PaceId,
  PaywallPlan,
  SessionMinutes,
  SexId,
  WeightUnit,
} from "./types";

const defaultAnswers: OnboardingAnswers = {
  goal: "build_muscle",
  experience: "one_two_years",
  sex: "male",
  age: 28,
  heightCm: 175,
  heightUnit: "cm",
  weightKg: 76,
  weightUnit: "kg",
  goalWeightKg: 72,
  pace: "steady",
  equipment: ["full_gym", "dumbbells"],
  trainingDays: [true, false, true, false, true, false, false],
  sessionMinutes: 45,
  diet: ["high_protein"],
  foodsToAvoid: "",
  mirrorSkipped: false,
  paywallPlan: "annual",
  completed: false,
};

type OnboardingStore = OnboardingAnswers & {
  setGoal: (goal: GoalId) => void;
  setExperience: (experience: ExperienceId) => void;
  setSex: (sex: SexId) => void;
  setAge: (age: number) => void;
  setHeightCm: (heightCm: number) => void;
  setHeightUnit: (heightUnit: HeightUnit) => void;
  setWeightKg: (weightKg: number) => void;
  setWeightUnit: (weightUnit: WeightUnit) => void;
  setGoalWeightKg: (goalWeightKg: number | null) => void;
  setPace: (pace: PaceId) => void;
  toggleEquipment: (id: EquipmentId) => void;
  toggleTrainingDay: (index: number) => void;
  setSessionMinutes: (sessionMinutes: SessionMinutes) => void;
  toggleDiet: (id: DietId) => void;
  setFoodsToAvoid: (foodsToAvoid: string) => void;
  setMirrorSkipped: (mirrorSkipped: boolean) => void;
  setPaywallPlan: (paywallPlan: PaywallPlan) => void;
  markCompleted: () => void;
  reset: () => void;
};

const toggleIn = <T>(list: T[], id: T): T[] =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  ...defaultAnswers,
  setGoal: (goal) => set({ goal }),
  setExperience: (experience) => set({ experience }),
  setSex: (sex) => set({ sex }),
  setAge: (age) => set({ age }),
  setHeightCm: (heightCm) => set({ heightCm }),
  setHeightUnit: (heightUnit) => set({ heightUnit }),
  setWeightKg: (weightKg) => set({ weightKg }),
  setWeightUnit: (weightUnit) => set({ weightUnit }),
  setGoalWeightKg: (goalWeightKg) => set({ goalWeightKg }),
  setPace: (pace) => set({ pace }),
  toggleEquipment: (id) =>
    set((s) => ({ equipment: toggleIn(s.equipment, id) })),
  toggleTrainingDay: (index) =>
    set((s) => {
      const trainingDays = [...s.trainingDays];
      trainingDays[index] = !trainingDays[index];
      return { trainingDays };
    }),
  setSessionMinutes: (sessionMinutes) => set({ sessionMinutes }),
  toggleDiet: (id) => set((s) => ({ diet: toggleIn(s.diet, id) })),
  setFoodsToAvoid: (foodsToAvoid) => set({ foodsToAvoid }),
  setMirrorSkipped: (mirrorSkipped) => set({ mirrorSkipped }),
  setPaywallPlan: (paywallPlan) => set({ paywallPlan }),
  markCompleted: () => set({ completed: true }),
  reset: () => set({ ...defaultAnswers }),
}));
