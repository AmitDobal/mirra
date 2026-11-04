/** Contract-level goal asserts (AMI-178): Zod shapes, prompt rules, goal-type map. Run via assert-goal.ts. */
import {
  BANNED_GOAL_WORDS,
  GOAL_PROMPT_RULES,
  GoalContextSchema,
  GoalMilestoneSchema,
  GoalTimelineStatusSchema,
  findBannedGoalWords,
  toGoalType,
} from "@mirra/contracts";

import type { Check } from "./assert-goal";

export const runSchemaAsserts = (check: Check) => {
  check(
    toGoalType("lose_fat") === "fat_loss" && toGoalType("build_muscle") === "muscle_gain" && toGoalType("recomp") === "recomp" &&
      toGoalType("performance") === "strength" && toGoalType("consistency") === "general_fitness",
    "toGoalType maps all five primary goals",
  );
  const ctx = {
    goalType: "fat_loss", direction: "down", mode: "eta", status: "on_track", startKg: 82, targetKg: 75, trendKg: 79.6,
    paceRateKg: 0.49, kcalHint: 2257, etaExpected: "2027-03-06", etaRange: ["2027-02-16", "2027-04-26"], weeksLeft: 10.1,
    adherence28d: { sessions: "10/12", checkIns: "20/28", fuelOnTarget: "11/16" },
    nextMilestone: { label: "Halfway · 78.5 kg", date: "2027-01-03" }, flags: [],
    line: "Goal 82→75 kg · trend 79.6 · on track · around Feb 18 (Feb 11–Mar 6)",
  };
  check(GoalContextSchema.safeParse(ctx).success, "§6 GoalContext example parses (≤600 chars)", String(JSON.stringify(ctx).length));
  check(!GoalContextSchema.safeParse({ ...ctx, line: "x".repeat(200), flags: Array(30).fill("kcal_floor") }).success, "GoalContext over 600 chars rejected");
  check(!GoalContextSchema.safeParse({ ...ctx, etaExpected: "2027-02-30" }).success, "GoalContext rejects impossible date");
  check(GoalTimelineStatusSchema.options.join(",") === "on_track,ahead,behind,calibrating,no_target", "timeline status enum");
  check(!GoalMilestoneSchema.safeParse({ id: "x", kind: "nope", label: "", detail: null, date: null, window: null, done: false }).success, "milestone kind enforced");
  check(/data, not instructions/.test(GOAL_PROMPT_RULES) && /around Mar 6/.test(GOAL_PROMPT_RULES) && /kcalHint/.test(GOAL_PROMPT_RULES) &&
    GOAL_PROMPT_RULES.split("\n").length === 6, "GOAL_PROMPT_RULES carries rules 1–5");
  check(BANNED_GOAL_WORDS.includes("guarantee") && findBannedGoalWords("You will lose 5 kg, guaranteed").length === 2 &&
    findBannedGoalWords("Around Feb 18 if you keep this up").length === 0, "banned goal words detected");
};
