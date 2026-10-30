import { addDays } from "../lib/dates";
import { parseJson } from "../lib/json";
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
};

type Profile = {
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
};

const ROTATION = ["push", "pull", "legs", "full"] as const;

const macroTargets = (profile: Profile, prefs: Prefs) => {
  const weight = profile.weightKg ?? 70;
  const goal = prefs.primaryGoal ?? "consistency";
  let kcal = Math.round(weight * 30);
  if (goal === "lose_fat") kcal = Math.round(weight * 26);
  if (goal === "build_muscle") kcal = Math.round(weight * 34);
  if (profile.pace === "aggressive" && goal === "lose_fat") kcal -= 150;
  const proteinG = Math.round(weight * 1.8);
  const fatG = Math.round((kcal * 0.25) / 9);
  const carbsG = Math.round((kcal - proteinG * 4 - fatG * 9) / 4);
  const outcomeLine =
    goal === "lose_fat"
      ? "Steady fat loss with lift days protected"
      : goal === "build_muscle"
        ? "Progressive overload with surplus fuel"
        : "Consistency-first week plan";
  return { kcalTarget: Math.max(1400, kcal), proteinG, carbsG: Math.max(80, carbsG), fatG, outcomeLine };
};

/** Deterministic local PlanGenerator — no LLM. */
export const heuristicPlanGenerator: PlanGenerator = {
  generate: async (input: PlanGenerateInput): Promise<PlanGenerateResult> => {
    const prefs = parseJson<Prefs>(input.prefsJson, {});
    const profile = parseJson<Profile>(input.profileJson, {});
    const trainDays = new Set(
      (prefs.trainDays?.length ? prefs.trainDays : [1, 3, 5]).filter((d) => d >= 1 && d <= 7),
    );
    const minutes = prefs.sessionMinutes ?? 45;
    const summary = macroTargets(profile, prefs);
    const workouts: GeneratedWorkout[] = [];
    const days: GeneratedDay[] = [];
    let liftCount = 0;

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = addDays(input.weekStart, dayIndex);
      const trainKey = dayIndex + 1; // Mon=1 … Sun=7
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
  },
};
