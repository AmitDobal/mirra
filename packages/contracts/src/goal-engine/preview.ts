/**
 * Onboarding entry point: same engine, no logs, `startDate = today`.
 * The S06 / S12 / S43 numbers come from here and match what the API stores.
 */
import type { Experience, Pace, PrimaryGoal, Sex, Units } from "../onboarding";
import { projectGoal } from "./project";
import type { GoalProjection, GoalType, IsoDate } from "./types";

const GOAL_TYPE_BY_PRIMARY: Record<PrimaryGoal, GoalType> = {
  lose_fat: "fat_loss",
  build_muscle: "muscle_gain",
  recomp: "recomp",
  performance: "strength",
  consistency: "general_fitness",
};

/** `preferences.primaryGoal` → engine goal type (§1). */
export const toGoalType = (primaryGoal: PrimaryGoal): GoalType => GOAL_TYPE_BY_PRIMARY[primaryGoal];

/** Subset of the onboarding body the engine needs (weights in kg). */
export type GoalPreviewAnswers = {
  profile: {
    sex?: Sex | null;
    ageYears?: number | null;
    heightCm?: number | null;
    weightKg?: number | null;
    goalWeightKg?: number | null;
    pace?: Pace | null;
  };
  preferences: {
    primaryGoal: PrimaryGoal;
    experience: Experience;
    trainDays?: readonly number[];
    units?: Units;
  };
};

export const previewGoal = (answers: GoalPreviewAnswers, today: IsoDate): GoalProjection => {
  const { profile: pr, preferences: pf } = answers;
  return projectGoal({
    profile: {
      goalType: toGoalType(pf.primaryGoal),
      pace: pr.pace ?? null,
      experience: pf.experience,
      sex: pr.sex ?? null,
      ageYears: pr.ageYears ?? null,
      heightCm: pr.heightCm ?? null,
      startWeightKg: pr.weightKg ?? null,
      targetWeightKg: pr.goalWeightKg ?? null,
      trainDaysPerWeek: new Set(pf.trainDays ?? []).size,
      units: pf.units ?? "metric",
    },
    startDate: today,
    today,
  });
};
