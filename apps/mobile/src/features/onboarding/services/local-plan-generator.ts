import { savePlan } from "@/db";
import type { OnboardingPutBody } from "@/lib/api/types";
import { ensureMirraDb, generateHeuristicWeekPlan } from "@/lib/local";

import type { OnboardingWeekPlan } from "../types";
import { localPlanToWeekPlan } from "./plan-persist";

/**
 * Offline heuristic → SQLite `savePlan`.
 * Prefer `runOnboardingGenerate` which already falls back here.
 */
export const generateLocalWeekPlan = async (
  body: OnboardingPutBody,
): Promise<OnboardingWeekPlan> => {
  await ensureMirraDb();
  const generated = generateHeuristicWeekPlan({
    weightKg: body.profile.weightKg,
    goalWeightKg: body.profile.goalWeightKg,
    pace: body.profile.pace,
    primaryGoal: body.preferences.primaryGoal,
    experience: body.preferences.experience,
    trainDays: body.preferences.trainDays,
    sessionMinutes: body.preferences.sessionMinutes,
  });
  const saved = await savePlan({ source: "onboarding", generated });
  return localPlanToWeekPlan(saved, "local");
};
