import { addDays } from "../lib/dates";
import { parseJson } from "../lib/json";
import {
  ageRecoveryHint,
  cuisineHint,
  fitToEquipment,
  scaleVolume,
  sexBand,
} from "../lib/plan-tuning";
import type {
  GeneratedDay,
  GeneratedWorkout,
  PlanGenerateInput,
  PlanGenerateResult,
  PlanGenerator,
} from "../ports/plan-generator";

type Prefs = {
  primaryGoal?: string;
  experience?: string;
  trainDays?: number[];
  sessionMinutes?: number;
  equipment?: string[];
  cuisineStyles?: string[];
  physiqueTarget?: string | null;
  lifestyleNotes?: string | null;
  variant?: "recommended" | "alternate";
};

type Profile = {
  sex?: string | null;
  ageYears?: number | null;
  weightKg?: number | null;
  goalWeightKg?: number | null;
  pace?: string | null;
};

const TEMPLATES: Record<string, GeneratedWorkout["exercises"]> = {
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
    { name: "Curl + extension superset", targetSets: 2, targetReps: "10-12", restSec: 60, swapGroup: "arms" },
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

const rotationFor = (prefs: Prefs): readonly string[] => {
  if (prefs.variant === "alternate") return UPPER_LOWER;
  if (prefs.physiqueTarget === "athletic" || prefs.physiqueTarget === "strong") {
    return UPPER_LOWER;
  }
  if (prefs.physiqueTarget === "muscular") return PPL;
  return PPL;
};

const macroTargets = (profile: Profile, prefs: Prefs) => {
  const weight = profile.weightKg ?? 70;
  const goal = prefs.primaryGoal ?? "consistency";
  const band = sexBand(profile.sex);
  let kcal = Math.round(weight * band.base);
  if (goal === "lose_fat") kcal = Math.round(weight * band.cut);
  if (goal === "build_muscle") kcal = Math.round(weight * band.build);
  if (prefs.physiqueTarget === "lean_cut") kcal -= 100;
  if (prefs.physiqueTarget === "muscular") kcal += 120;
  if (profile.pace === "aggressive" && goal === "lose_fat") kcal -= 150;
  const proteinG = Math.round(weight * band.protein);
  const fatG = Math.round((kcal * 0.25) / 9);
  const carbsG = Math.round((kcal - proteinG * 4 - fatG * 9) / 4);
  const look =
    prefs.physiqueTarget?.replace(/_/g, " ") ??
    (goal === "lose_fat" ? "lean progress" : goal === "build_muscle" ? "muscle gain" : "consistency");
  const variantNote =
    prefs.variant === "alternate" ? "Upper/lower balance" : "Progressive lift focus";
  const lifestyleHint = prefs.lifestyleNotes?.trim()
    ? " Tuned to your routine notes."
    : "";
  const tuning = `${ageRecoveryHint(profile.ageYears)}${cuisineHint(prefs.cuisineStyles)}`;
  return {
    kcalTarget: Math.max(1400, kcal),
    proteinG,
    carbsG: Math.max(80, carbsG),
    fatG,
    outcomeLine: `${variantNote} for ${look}.${lifestyleHint}${tuning}`.trim(),
  };
};

/** Deterministic local PlanGenerator — no LLM. Supports recommended vs alternate splits. */
export const heuristicPlanGenerator: PlanGenerator = {
  generate: async (input: PlanGenerateInput): Promise<PlanGenerateResult> => {
    const prefs = parseJson<Prefs>(input.prefsJson, {});
    const profile = parseJson<Profile>(input.profileJson, {});
    const trainDays = new Set(
      (prefs.trainDays?.length ? prefs.trainDays : [1, 3, 5]).filter((d) => d >= 1 && d <= 7),
    );
    const minutes = prefs.sessionMinutes ?? 45;
    const rotation = rotationFor(prefs);
    const summary = macroTargets(profile, prefs);
    const workouts: GeneratedWorkout[] = [];
    const days: GeneratedDay[] = [];
    let liftCount = 0;

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = addDays(input.weekStart, dayIndex);
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
          fitToEquipment(TEMPLATES[key] ?? TEMPLATES.full!, prefs.equipment),
          { experience: prefs.experience, ageYears: profile.ageYears, minutes },
        ),
      });
      days.push({ dayIndex, date, kind: "lift", label, workoutIndex });
      liftCount += 1;
    }

    return { summary, days, workouts };
  },
};
