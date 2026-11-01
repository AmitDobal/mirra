import { getCurrentPlan as getLocalPlan } from "@/db";
import { persistWeekPlan } from "@/features/onboarding/services/plan-persist";
import type { OnboardingWeekPlan } from "@/features/onboarding/types";
import type { CurrentPlan, PlanWorkout } from "@/lib/api";
import { errorMessage, logger } from "@/lib/logger";

const toWorkout = (
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

/** Flat API plan → onboarding shape for SQLite mirror. */
const toWeekPlan = (plan: CurrentPlan): OnboardingWeekPlan => {
  const workouts = plan.days
    .map((d) => d.workout)
    .filter((w): w is PlanWorkout => w != null)
    .map(toWorkout);
  const seen = new Set<string>();
  const unique = workouts.filter((w) => {
    if (seen.has(w.id)) return false;
    seen.add(w.id);
    return true;
  });
  return {
    id: plan.id,
    version: plan.version,
    status: plan.status,
    weekStart: plan.weekStart,
    summary: plan.summary as OnboardingWeekPlan["summary"] | undefined,
    days: plan.days.map((d) => ({
      id: d.id,
      dayIndex: d.dayIndex,
      date: d.date,
      kind: d.kind,
      label: d.label,
      workout: d.workout ? toWorkout(d.workout) : null,
    })),
    workouts: unique,
    source: "api",
  };
};

/**
 * Cache D1 week plan into SQLite once so relaunch works offline.
 * Skips when a full local week already exists (avoids rewrite on every focus).
 */
export const mirrorPlanToLocal = async (plan: CurrentPlan): Promise<void> => {
  if (!plan.days?.length) return;
  try {
    const local = await getLocalPlan();
    if ((local?.days?.length ?? 0) >= 7) return;
    await persistWeekPlan(toWeekPlan(plan), "api");
  } catch (err) {
    logger.warn("today.mirror_plan_failed", { message: errorMessage(err) });
  }
};
