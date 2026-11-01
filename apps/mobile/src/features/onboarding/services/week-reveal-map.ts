import type { CurrentPlan, PlanWorkout } from "@/lib/api";

import type { OnboardingWeekPlan } from "../types";

export const goalLabel = (goal: string | null) => {
  const map: Record<string, string> = {
    lose_fat: "Lose fat",
    build_muscle: "Build muscle",
    recomp: "Recomp",
    consistent: "Get consistent",
    performance: "Performance",
  };
  return goal ? (map[goal] ?? "Build muscle") : "Build muscle";
};

export const dayTag = (kind: string, hasWorkout: boolean) => {
  if (kind === "lift" || hasWorkout) return "Lift";
  if (kind === "fuel") return "Fuel";
  return "Rest";
};

const toOnboardingWorkout = (
  w: PlanWorkout,
): OnboardingWeekPlan["workouts"][number] => ({
  id: w.id,
  title: w.title,
  durationMin: w.durationMin,
  focus: w.focus,
  exercises: w.exercises.map((e) => ({
    id: e.id,
    name: e.name,
    cue: e.cue,
    targetSets: e.targetSets,
    targetReps: e.targetReps,
    restSec: e.restSec,
  })),
});

export const fromApiPlan = (raw: CurrentPlan): OnboardingWeekPlan => {
  const workouts = raw.days
    .map((d) => d.workout)
    .filter((w): w is NonNullable<typeof w> => w != null)
    .map(toOnboardingWorkout);
  const seen = new Set<string>();
  const unique = workouts.filter((w) => {
    if (seen.has(w.id)) return false;
    seen.add(w.id);
    return true;
  });
  const summary = raw.summary as OnboardingWeekPlan["summary"] | undefined;
  return {
    id: raw.id,
    version: raw.version,
    status: raw.status,
    weekStart: raw.weekStart,
    summary,
    days: raw.days.map((d) => ({
      id: d.id,
      dayIndex: d.dayIndex,
      date: d.date,
      kind: d.kind,
      label: d.label,
      workout: d.workout ? toOnboardingWorkout(d.workout) : null,
    })),
    workouts: unique,
    source: "api",
  };
};
