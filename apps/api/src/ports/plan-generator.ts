/** Week plan AI generation — heuristic adapter until Workers AI / OpenAI lands. */

export type PlanGenerateInput = {
  userId: string;
  timezone: string;
  weekStart: string;
  prefsJson: string;
  profileJson: string;
  kind: "generate" | "rebuild";
};

export type GeneratedExercise = {
  name: string;
  cue?: string;
  targetSets: number;
  targetReps: string;
  restSec?: number;
  swapGroup?: string;
};

export type GeneratedWorkout = {
  title: string;
  durationMin: number;
  focus?: string;
  calorieEst?: number;
  exercises: GeneratedExercise[];
};

export type GeneratedDay = {
  dayIndex: number;
  date: string;
  kind: "lift" | "rest" | "fuel";
  label?: string;
  /** Index into `workouts` when kind=lift. */
  workoutIndex?: number;
};

export type GeneratedSummary = {
  kcalTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  outcomeLine: string;
};

export type PlanGenerateResult = {
  summary: GeneratedSummary;
  days: GeneratedDay[];
  workouts: GeneratedWorkout[];
};

export type PlanGenerator = {
  generate: (input: PlanGenerateInput) => Promise<PlanGenerateResult>;
};

export const stubPlanGenerator: PlanGenerator = {
  generate: async () => {
    throw new Error("PlanGenerator not configured");
  },
};
