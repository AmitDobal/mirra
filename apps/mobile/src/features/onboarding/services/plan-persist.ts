import {
  getCurrentPlan,
  saveOnboarding,
  savePlan,
  type LocalPlan,
  type OnboardingInput,
} from "@/db";
import { ensureMirraDb } from "@/lib/local";
import type { HeuristicDay, HeuristicPlanResult } from "@/lib/local";
import type { OnboardingPutBody } from "@/lib/api/types";

import type { OnboardingWeekPlan } from "../types";

const emptySummary = () => ({
  kcalTarget: 2000,
  proteinG: 140,
  carbsG: 200,
  fatG: 60,
  outcomeLine: "",
});

/** Map API/UI week plan → `savePlan` heuristic payload. */
export const weekPlanToHeuristic = (
  plan: OnboardingWeekPlan,
): HeuristicPlanResult => {
  let workouts = plan.workouts.map((w) => ({
    title: w.title,
    durationMin: w.durationMin,
    focus: w.focus ?? undefined,
    exercises: w.exercises.map((e) => ({
      name: e.name,
      cue: e.cue ?? undefined,
      targetSets: e.targetSets,
      targetReps: e.targetReps,
      restSec: e.restSec ?? undefined,
    })),
  }));

  if (!workouts.length) {
    workouts = plan.days
      .filter((d) => d.workout)
      .map((d) => {
        const w = d.workout!;
        return {
          title: w.title,
          durationMin: w.durationMin,
          focus: w.focus ?? undefined,
          exercises: w.exercises.map((e) => ({
            name: e.name,
            cue: e.cue ?? undefined,
            targetSets: e.targetSets,
            targetReps: e.targetReps,
            restSec: e.restSec ?? undefined,
          })),
        };
      });
  }

  const idToIndex = new Map(plan.workouts.map((w, i) => [w.id, i]));
  if (!plan.workouts.length) {
    let i = 0;
    for (const d of plan.days) {
      if (d.workout) idToIndex.set(d.workout.id, i++);
    }
  }

  const days = plan.days.map((d) => {
    const kind: HeuristicDay["kind"] =
      d.kind === "lift" || d.kind === "fuel" || d.kind === "rest"
        ? d.kind
        : "rest";
    const workoutIndex =
      d.workoutId != null
        ? idToIndex.get(d.workoutId)
        : d.workout
          ? idToIndex.get(d.workout.id)
          : undefined;
    return {
      dayIndex: d.dayIndex,
      date: d.date,
      kind,
      label: d.label ?? undefined,
      workoutIndex,
    };
  });

  const s = plan.summary;
  return {
    summary: {
      kcalTarget: s?.kcalTarget ?? emptySummary().kcalTarget,
      proteinG: s?.proteinG ?? emptySummary().proteinG,
      carbsG: emptySummary().carbsG,
      fatG: emptySummary().fatG,
      outcomeLine: s?.outcomeLine ?? "",
    },
    days,
    workouts,
  };
};

export const localPlanToWeekPlan = (
  plan: LocalPlan,
  source: "api" | "local",
): OnboardingWeekPlan => {
  const seen = new Set<string>();
  const workouts: OnboardingWeekPlan["workouts"] = [];
  for (const d of plan.days) {
    const w = d.workout;
    if (!w || seen.has(w.id)) continue;
    seen.add(w.id);
    workouts.push({
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
  }

  return {
    id: plan.id,
    version: plan.version,
    status: plan.status,
    weekStart: plan.weekStart,
    summary: {
      kcalTarget: plan.summary.kcalTarget,
      proteinG: plan.summary.proteinG,
      outcomeLine: plan.summary.outcomeLine,
    },
    days: plan.days.map((d) => ({
      id: d.id,
      dayIndex: d.dayIndex,
      date: d.date,
      kind: d.kind,
      label: d.label,
      workoutId: d.workout?.id ?? null,
      workout: d.workout
        ? {
            id: d.workout.id,
            title: d.workout.title,
            durationMin: d.workout.durationMin,
            focus: d.workout.focus,
            exercises: d.workout.exercises.map((e) => ({
              id: e.id,
              name: e.name,
              cue: e.cue,
              targetSets: e.targetSets,
              targetReps: e.targetReps,
              restSec: e.restSec,
            })),
          }
        : null,
    })),
    workouts,
    source,
  };
};

export const bodyToOnboardingInput = (
  body: OnboardingPutBody,
): OnboardingInput => ({
  profile: body.profile,
  preferences: body.preferences,
});

/** Persist profile + prefs; stamps `plan_generated_at` only (not funnel-complete). */
export const persistOnboardingProfile = async (
  body: OnboardingPutBody,
): Promise<void> => {
  await ensureMirraDb();
  await saveOnboarding(bodyToOnboardingInput(body));
};

/** Write week plan rows via `savePlan`; return UI shape. */
export const persistWeekPlan = async (
  plan: OnboardingWeekPlan,
  source: "api" | "local",
): Promise<OnboardingWeekPlan> => {
  await ensureMirraDb();
  const saved = await savePlan({
    weekStart: plan.weekStart || undefined,
    source: "onboarding",
    generated: weekPlanToHeuristic(plan),
  });
  return localPlanToWeekPlan(saved, source);
};

/** Read current ready plan from SQLite for week-reveal. */
export const loadWeekPlanFromDb = async (): Promise<OnboardingWeekPlan | null> => {
  await ensureMirraDb();
  const plan = await getCurrentPlan();
  if (!plan) return null;
  return localPlanToWeekPlan(plan, "local");
};
