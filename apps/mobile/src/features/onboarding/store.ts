import { create } from "zustand";

import type {
  CuisineId,
  DietId,
  EquipmentId,
  ExperienceId,
  GoalId,
  HeightUnit,
  OnboardingAnswers,
  OnboardingPlanOption,
  OnboardingWeekPlan,
  PaceId,
  PaywallPlan,
  PhysiqueId,
  PlanOptionKey,
  SessionMinutes,
  SexId,
  TrainerPersonaId,
  WeightUnit,
} from "./types";

const defaultAnswers: OnboardingAnswers = {
  goal: "build_muscle",
  experience: "one_two_years",
  // Never silently male: user picks, otherwise neutral estimate (prefer_not -> "unspecified").
  sex: "prefer_not",
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
  cuisines: [],
  cuisineOther: "",
  foodsToAvoid: "",
  physiqueTarget: null,
  lifestyleNotes: "",
  trainerPersona: "drill",
  mirrorSkipped: false,
  mirrorUri: null,
  paywallPlan: "annual",
  completed: false,
  weekPlan: null,
  planOptions: null,
  selectedPlanKey: "recommended",
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
  toggleCuisine: (id: CuisineId) => void;
  setCuisineOther: (cuisineOther: string) => void;
  setFoodsToAvoid: (foodsToAvoid: string) => void;
  setPhysiqueTarget: (physiqueTarget: PhysiqueId | null) => void;
  setLifestyleNotes: (lifestyleNotes: string) => void;
  setTrainerPersona: (trainerPersona: TrainerPersonaId) => void;
  setMirrorSkipped: (mirrorSkipped: boolean) => void;
  setMirrorUri: (mirrorUri: string | null) => void;
  setPaywallPlan: (paywallPlan: PaywallPlan) => void;
  setWeekPlan: (weekPlan: OnboardingWeekPlan | null) => void;
  setPlanOptions: (planOptions: OnboardingPlanOption[] | null) => void;
  setSelectedPlanKey: (selectedPlanKey: PlanOptionKey) => void;
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
  toggleCuisine: (id) =>
    set((s) => {
      const cuisines = toggleIn(s.cuisines, id);
      const cuisineOther =
        id === "other" && !cuisines.includes("other") ? "" : s.cuisineOther;
      return { cuisines, cuisineOther };
    }),
  setCuisineOther: (cuisineOther) => set({ cuisineOther }),
  setFoodsToAvoid: (foodsToAvoid) => set({ foodsToAvoid }),
  setPhysiqueTarget: (physiqueTarget) => set({ physiqueTarget }),
  setLifestyleNotes: (lifestyleNotes) => set({ lifestyleNotes }),
  setTrainerPersona: (trainerPersona) => set({ trainerPersona }),
  setMirrorSkipped: (mirrorSkipped) => set({ mirrorSkipped }),
  setMirrorUri: (mirrorUri) => set({ mirrorUri }),
  setPaywallPlan: (paywallPlan) => set({ paywallPlan }),
  setWeekPlan: (weekPlan) => set({ weekPlan }),
  setPlanOptions: (planOptions) => set({ planOptions }),
  setSelectedPlanKey: (selectedPlanKey) => set({ selectedPlanKey }),
  markCompleted: () => set({ completed: true }),
  reset: () => set({ ...defaultAnswers }),
}));
