import { addDays, mondayOf, todayUtc } from "../../db/dates";
import type { PlanSummary } from "../../db/types";

export type HeuristicExercise = {
  readonly name: string;
  readonly cue?: string;
  readonly targetSets: number;
  readonly targetReps: string;
  readonly restSec?: number;
  readonly swapGroup?: string;
};

export type HeuristicWorkout = {
  readonly title: string;
  readonly durationMin: number;
  readonly focus?: string;
  readonly calorieEst?: number;
  readonly exercises: readonly HeuristicExercise[];
};

export type HeuristicDay = {
  readonly dayIndex: number;
  readonly date: string;
  readonly kind: "lift" | "rest" | "fuel";
  readonly label?: string;
  readonly workoutIndex?: number;
};

export type HeuristicPlanResult = {
  readonly summary: PlanSummary;
  readonly days: readonly HeuristicDay[];
  readonly workouts: readonly HeuristicWorkout[];
};

export type HeuristicPlanInput = {
  readonly weekStart?: string;
  readonly weightKg?: number | null;
  readonly goalWeightKg?: number | null;
  readonly pace?: string | null;
  readonly primaryGoal?: string;
  readonly experience?: string;
  readonly trainDays?: number[];
  readonly sessionMinutes?: number;
};

const TEMPLATES: Record<string, HeuristicExercise[]> = {
  push: [
    { name: "Push-up", cue: "Brace core", targetSets: 3, targetReps: "8-12", restSec: 90, swapGroup: "push" },
    { name: "Overhead press", cue: "Ribs down", targetSets: 3, targetReps: "8-10", restSec: 90, swapGroup: "press" },
    { name: "Tricep extension", targetSets: 2, targetReps: "10-15", restSec: 60, swapGroup: "tris" },
  ],
  pull: [
    { name: "Row", cue: "Pull elbows", targetSets: 3, targetReps: "8-12", restSec: 90, swapGroup: "row" },
    { name: "Lat pulldown / pull-up", targetSets: 3, targetReps: "6-10", restSec: 90, swapGroup: "pull" },
    { name: "Face pull", targetSets: 2, targetReps: "12-15", restSec: 60, swapGroup: "rear" },
  ],
  legs: [
    { name: "Squat", cue: "Knees track toes", targetSets: 3, targetReps: "6-10", restSec: 120, swapGroup: "squat" },
    { name: "Romanian deadlift", targetSets: 3, targetReps: "8-10", restSec: 90, swapGroup: "hinge" },
    { name: "Lunges", targetSets: 2, targetReps: "8-10/leg", restSec: 75, swapGroup: "lunge" },
  ],
  full: [
    { name: "Goblet squat", targetSets: 3, targetReps: "8-12", restSec: 90, swapGroup: "squat" },
    { name: "Push-up", targetSets: 3, targetReps: "8-12", restSec: 75, swapGroup: "push" },
    { name: "Row", targetSets: 3, targetReps: "8-12", restSec: 75, swapGroup: "row" },
    { name: "Plank", targetSets: 2, targetReps: "30-45s", restSec: 45, swapGroup: "core" },
  ],
};

const ROTATION = ["push", "pull", "legs", "full"] as const;

const macroTargets = (input: HeuristicPlanInput): PlanSummary => {
  const weight = input.weightKg ?? 70;
  const goal = input.primaryGoal ?? "consistency";
  let kcal = Math.round(weight * 30);
  if (goal === "lose_fat") kcal = Math.round(weight * 26);
  if (goal === "build_muscle") kcal = Math.round(weight * 34);
  if (input.pace === "aggressive" && goal === "lose_fat") kcal -= 150;
  const proteinG = Math.round(weight * 1.8);
  const fatG = Math.round((kcal * 0.25) / 9);
  const carbsG = Math.round((kcal - proteinG * 4 - fatG * 9) / 4);
  const outcomeLine =
    goal === "lose_fat"
      ? "Steady fat loss with lift days protected"
      : goal === "build_muscle"
        ? "Progressive overload with surplus fuel"
        : "Consistency-first week plan";
  return {
    kcalTarget: Math.max(1400, kcal),
    proteinG,
    carbsG: Math.max(80, carbsG),
    fatG,
    outcomeLine,
  };
};

/** Deterministic offline week plan — same spirit as API heuristic. */
export const generateHeuristicWeekPlan = (
  input: HeuristicPlanInput = {},
): HeuristicPlanResult => {
  const weekStart = input.weekStart ?? mondayOf(todayUtc());
  const trainDays = new Set(
    (input.trainDays?.length ? input.trainDays : [1, 3, 5]).filter(
      (d) => d >= 1 && d <= 7,
    ),
  );
  const minutes = input.sessionMinutes ?? 45;
  const summary = macroTargets(input);
  const workouts: HeuristicWorkout[] = [];
  const days: HeuristicDay[] = [];
  let liftCount = 0;

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const date = addDays(weekStart, dayIndex);
    const trainKey = dayIndex + 1;
    if (!trainDays.has(trainKey)) {
      days.push({ dayIndex, date, kind: "rest", label: "Rest" });
      continue;
    }
    const key = ROTATION[liftCount % ROTATION.length]!;
    const label = key[0]!.toUpperCase() + key.slice(1);
    const workoutIndex = workouts.length;
    workouts.push({
      title: `${label} day`,
      durationMin: minutes,
      focus: key,
      calorieEst: Math.round(minutes * 7),
      exercises: TEMPLATES[key] ?? TEMPLATES.full!,
    });
    days.push({ dayIndex, date, kind: "lift", label, workoutIndex });
    liftCount += 1;
  }

  return { summary, days, workouts };
};
