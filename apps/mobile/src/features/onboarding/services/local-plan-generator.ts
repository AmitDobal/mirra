import { savePlan } from "@/db";
import type { OnboardingPutBody } from "@/lib/api/types";
import { ensureMirraDb, generateHeuristicWeekPlan } from "@/lib/local";

import type { OnboardingWeekPlan } from "../types";
import { localPlanToWeekPlan } from "./plan-persist";

type LocalOpts = {
  readonly variant?: "recommended" | "alternate";
  /** When true, skip SQLite persist (for dual preview options). */
  readonly previewOnly?: boolean;
};

/**
 * Offline heuristic → SQLite `savePlan` (unless previewOnly).
 * Prefer `runOnboardingGenerate` which already falls back here.
 */
export const generateLocalWeekPlan = async (
  body: OnboardingPutBody,
  opts: LocalOpts = {},
): Promise<OnboardingWeekPlan> => {
  await ensureMirraDb();
  const generated = generateHeuristicWeekPlan({
    sex: body.profile.sex,
    ageYears: body.profile.ageYears,
    weightKg: body.profile.weightKg,
    goalWeightKg: body.profile.goalWeightKg,
    pace: body.profile.pace,
    primaryGoal: body.preferences.primaryGoal,
    experience: body.preferences.experience,
    trainDays: body.preferences.trainDays,
    sessionMinutes: body.preferences.sessionMinutes,
    equipment: body.preferences.equipment,
    dietTags: body.preferences.dietTags,
    foodsAvoid: body.preferences.foodsAvoid,
    cuisineStyles: body.preferences.cuisineStyles,
    physiqueTarget: body.preferences.physiqueTarget,
    lifestyleNotes: body.preferences.lifestyleNotes,
    variant: opts.variant ?? "recommended",
  });

  if (opts.previewOnly) {
    const weekStart = generated.days[0]?.date ?? "";
    return {
      id: `preview-${opts.variant ?? "recommended"}`,
      version: 1,
      status: "ready",
      weekStart,
      summary: {
        ...generated.summary,
        generator: "heuristic",
      },
      days: generated.days.map((d, i) => ({
        id: `d${i}`,
        dayIndex: d.dayIndex,
        date: d.date,
        kind: d.kind,
        label: d.label ?? null,
        workout:
          d.workoutIndex != null && generated.workouts[d.workoutIndex]
            ? {
                id: `w${d.workoutIndex}`,
                title: generated.workouts[d.workoutIndex]!.title,
                durationMin: generated.workouts[d.workoutIndex]!.durationMin,
                focus: generated.workouts[d.workoutIndex]!.focus ?? null,
                exercises: generated.workouts[d.workoutIndex]!.exercises.map(
                  (e, ei) => ({
                    id: `e${d.workoutIndex}-${ei}`,
                    name: e.name,
                    cue: e.cue ?? null,
                    targetSets: e.targetSets,
                    targetReps: e.targetReps,
                    restSec: e.restSec ?? null,
                  }),
                ),
              }
            : null,
      })),
      workouts: generated.workouts.map((w, i) => ({
        id: `w${i}`,
        title: w.title,
        durationMin: w.durationMin,
        focus: w.focus ?? null,
        exercises: w.exercises.map((e, ei) => ({
          id: `e${i}-${ei}`,
          name: e.name,
          cue: e.cue ?? null,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
          restSec: e.restSec ?? null,
        })),
      })),
      source: "local",
    };
  }

  const saved = await savePlan({ source: "onboarding", generated });
  return localPlanToWeekPlan(saved, "local");
};
