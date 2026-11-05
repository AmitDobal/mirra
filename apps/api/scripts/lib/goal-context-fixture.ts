/**
 * Day-35 `GoalContext` for the 82 → 75 kg fixture (AMI-179 seed), built with the real engine.
 * Shared by the AMI-181 asserts (context, prompts, goal impact).
 */
import { GoalContextSchema, projectGoal, type GoalContext } from "@mirra/contracts";

import { toGoalContext, type PlanSummaryRow } from "../../src/lib/goal";
import { DAY35, START, fixtureInput } from "./goal-seed";

export const fixtureGoalContext = (): GoalContext => {
  const g = projectGoal(fixtureInput());
  const plan: PlanSummaryRow = {
    version: 1,
    goalType: g.goalType,
    primaryGoal: "lose_fat",
    pace: "steady",
    direction: g.direction,
    mode: g.mode,
    startDate: START,
    startWeightKg: 82,
    targetWeightKg: 75,
    targetEffectiveKg: g.targetEffectiveKg,
    paceRateKg: g.paceRateKg,
    kcalHint: g.kcalHint,
    committedAt: null,
    etaExpected: g.band.expected,
  };
  return GoalContextSchema.parse(toGoalContext(plan, g, DAY35));
};

export const FIXTURE_LINE = "Goal 82→75 kg · trend 79.6 · on track · around Feb 18 (Feb 11–Mar 6)";

/** Same goal, different status (behind / calibrating / ahead) and ETA. */
export const withStatus = (g: GoalContext, status: GoalContext["status"], over: Partial<GoalContext> = {}): GoalContext => ({
  ...g,
  status,
  ...over,
});

/** No target weight: milestones mode, no ETA. */
export const noTargetGoal = (g: GoalContext): GoalContext => ({
  ...g,
  mode: "milestones",
  status: "no_target",
  targetKg: null,
  etaExpected: null,
  etaRange: null,
  weeksLeft: null,
  line: "Goal fat loss · trend 79.6 · no target",
});
