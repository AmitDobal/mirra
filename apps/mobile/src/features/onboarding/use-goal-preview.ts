import { goalEngine, previewGoal, type GoalProjection } from "@mirra/contracts";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { localIsoDate } from "@/features/goal/goal-format";

import { toGoalPreviewAnswers, type GoalSource } from "./goal-preview";
import { useOnboardingStore } from "./store";

/**
 * Dev-only fixed "today" (e.g. `EXPO_PUBLIC_GOAL_TODAY=2026-11-04`) so S06/S12/S43 can be
 * checked against the Stitch fixture dates. Release builds always use the device date.
 */
const devToday = __DEV__ ? (process.env.EXPO_PUBLIC_GOAL_TODAY ?? "") : "";

export const goalToday = (): string =>
  devToday && goalEngine.isIsoDate(devToday) ? devToday : localIsoDate(new Date());

const pick = (s: GoalSource): GoalSource => ({
  goal: s.goal,
  experience: s.experience,
  sex: s.sex,
  age: s.age,
  heightCm: s.heightCm,
  weightKg: s.weightKg,
  goalWeightKg: s.goalWeightKg,
  pace: s.pace,
  trainingDays: s.trainingDays,
  weightUnit: s.weightUnit,
});

/** Onboarding answers (store) for the goal engine; shallow-stable between renders. */
export const useGoalSource = (): GoalSource => useOnboardingStore(useShallow(pick));

/** Offline, pre-auth projection from the current answers (memoized). */
export const useGoalPreview = (): { readonly source: GoalSource; readonly projection: GoalProjection } => {
  const source = useGoalSource();
  const projection = useMemo(() => previewGoal(toGoalPreviewAnswers(source), goalToday()), [source]);
  return { source, projection };
};
