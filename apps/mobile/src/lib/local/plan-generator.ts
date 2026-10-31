import { addDays, mondayOf, todayUtc } from "../../db/dates";
import type { PlanSummary } from "../../db/types";
import {
  ageRecoveryHint,
  cuisineHint,
  fitToEquipment,
  scaleVolume,
  sexBand,
} from "./plan-tuning";

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
  readonly sex?: string | null;
  readonly weightKg?: number | null;
  readonly goalWeightKg?: number | null;
  readonly pace?: string | null;
  readonly primaryGoal?: string;
  readonly experience?: string;
  readonly trainDays?: number[];
  readonly sessionMinutes?: number;
  readonly ageYears?: number | null;
  readonly equipment?: readonly string[];
  readonly dietTags?: readonly string[];
  readonly foodsAvoid?: string | null;
  readonly cuisineStyles?: readonly string[];
  readonly physiqueTarget?: string | null;
  readonly lifestyleNotes?: string | null;
  readonly variant?: "recommended" | "alternate";
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
  upper: [
    { name: "Bench / floor press", targetSets: 3, targetReps: "6-10", restSec: 90, swapGroup: "press" },
    { name: "Row", targetSets: 3, targetReps: "8-12", restSec: 90, swapGroup: "row" },
    { name: "Lateral raise", targetSets: 2, targetReps: "12-15", restSec: 60, swapGroup: "side" },
    { name: "Curl + extension", targetSets: 2, targetReps: "10-12", restSec: 60, swapGroup: "arms" },
  ],
  lower: [
    { name: "Front squat / goblet", targetSets: 3, targetReps: "6-10", restSec: 120, swapGroup: "squat" },
    { name: "Hip hinge", targetSets: 3, targetReps: "8-10", restSec: 90, swapGroup: "hinge" },
    { name: "Split squat", targetSets: 2, targetReps: "8/leg", restSec: 75, swapGroup: "lunge" },
    { name: "Calf raise", targetSets: 2, targetReps: "12-15", restSec: 45, swapGroup: "calf" },
  ],
};

const PPL = ["push", "pull", "legs", "full"] as const;
const UPPER_LOWER = ["upper", "lower", "upper", "lower"] as const;

const rotationFor = (input: HeuristicPlanInput): readonly string[] => {
  if (input.variant === "alternate") return UPPER_LOWER;
  if (input.physiqueTarget === "athletic" || input.physiqueTarget === "strong") {
    return UPPER_LOWER;
  }
  return PPL;
};

const macroTargets = (input: HeuristicPlanInput): PlanSummary => {
  const weight = input.weightKg ?? 70;
  const goal = input.primaryGoal ?? "consistency";
  const band = sexBand(input.sex);
  let kcal = Math.round(weight * band.base);
  if (goal === "lose_fat") kcal = Math.round(weight * band.cut);
  if (goal === "build_muscle") kcal = Math.round(weight * band.build);
  if (input.physiqueTarget === "lean_cut") kcal -= 100;
  if (input.physiqueTarget === "muscular") kcal += 120;
  if (input.pace === "aggressive" && goal === "lose_fat") kcal -= 150;
  const proteinG = Math.round(weight * band.protein);
  const fatG = Math.round((kcal * 0.25) / 9);
  const carbsG = Math.round((kcal - proteinG * 4 - fatG * 9) / 4);
  const look =
    input.physiqueTarget?.replace(/_/g, " ") ??
    (goal === "lose_fat"
      ? "lean progress"
      : goal === "build_muscle"
        ? "muscle gain"
        : "consistency");
  const variantNote =
    input.variant === "alternate" ? "Upper/lower balance" : "Progressive lift focus";
  const lifestyleHint = input.lifestyleNotes?.trim()
    ? " Tuned to your routine notes."
    : "";
  const tuning = `${ageRecoveryHint(input.ageYears)}${cuisineHint(input.cuisineStyles)}`;
  return {
    kcalTarget: Math.max(1400, kcal),
    proteinG,
    carbsG: Math.max(80, carbsG),
    fatG,
    outcomeLine: `${variantNote} for ${look}.${lifestyleHint}${tuning}`.trim(),
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
  const rotation = rotationFor(input);
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
    const key = rotation[liftCount % rotation.length]!;
    const label = key[0]!.toUpperCase() + key.slice(1);
    const workoutIndex = workouts.length;
    workouts.push({
      title: `${label} day`,
      durationMin: minutes,
      focus: key,
      calorieEst: Math.round(minutes * 7),
      exercises: scaleVolume(
        fitToEquipment(TEMPLATES[key] ?? TEMPLATES.full!, input.equipment),
        { experience: input.experience, ageYears: input.ageYears, minutes },
      ),
    });
    days.push({ dayIndex, date, kind: "lift", label, workoutIndex });
    liftCount += 1;
  }

  return { summary, days, workouts };
};
