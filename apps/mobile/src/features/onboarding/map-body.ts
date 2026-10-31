import type { OnboardingPutBody } from "@/lib/api/types";

import type {
  ExperienceId,
  GoalId,
  OnboardingAnswers,
  SexId,
} from "./types";

const GOAL_MAP: Record<GoalId, OnboardingPutBody["preferences"]["primaryGoal"]> =
  {
    lose_fat: "lose_fat",
    build_muscle: "build_muscle",
    recomp: "recomp",
    consistent: "consistency",
    performance: "performance",
  };

const EXP_MAP: Record<
  ExperienceId,
  OnboardingPutBody["preferences"]["experience"]
> = {
  new: "new",
  some_months: "months",
  one_two_years: "y1_2",
  three_plus: "y3_plus",
};

const SEX_MAP: Record<SexId, "female" | "male" | "unspecified"> = {
  female: "female",
  male: "male",
  prefer_not: "unspecified",
};

/** Map UI store answers → API `OnboardingBody` / `OnboardingPutBody`. */
export const toOnboardingBody = (
  answers: OnboardingAnswers,
): OnboardingPutBody => {
  const trainDays = answers.trainingDays
    .map((on, i) => (on ? i + 1 : null))
    .filter((d): d is number => d != null);

  const units =
    answers.heightUnit === "ft" || answers.weightUnit === "lb"
      ? "imperial"
      : "metric";

  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const lifestyleParts = [
    answers.lifestyleNotes.trim(),
    answers.cuisines.includes("other") && answers.cuisineOther.trim()
      ? `Other cuisines: ${answers.cuisineOther.trim()}`
      : "",
  ].filter(Boolean);

  return {
    profile: {
      sex: SEX_MAP[answers.sex],
      ageYears: answers.age,
      heightCm: answers.heightCm,
      weightKg: answers.weightKg,
      goalWeightKg: answers.goalWeightKg,
      pace: answers.pace,
      timezone,
    },
    preferences: {
      primaryGoal: GOAL_MAP[answers.goal ?? "build_muscle"],
      experience: EXP_MAP[answers.experience ?? "new"],
      equipment: answers.equipment,
      trainDays: trainDays.length ? trainDays : [1, 3, 5],
      sessionMinutes: answers.sessionMinutes,
      dietTags: answers.diet,
      foodsAvoid: answers.foodsToAvoid.trim() || null,
      cuisineStyles: answers.cuisines,
      units,
      trainerPersona: answers.trainerPersona,
      physiqueTarget: answers.physiqueTarget,
      lifestyleNotes: lifestyleParts.length ? lifestyleParts.join("\n") : null,
    },
  };
};
