/**
 * Offline assertions (AMI-159 + AMI-163): plan apply 4/day, meal regen 2/day,
 * propose 20/day (AMI-171), draft TTL, action keys.
 *   npm run test:revise-caps -w @mirra/api
 */
import { DAILY_MEAL_REGEN_LIMIT, MEAL_REGEN_ACTIONS } from "../src/services/meal-plan-draft";
import {
  DAILY_PROPOSE_LIMIT,
  DAILY_REVISE_LIMIT,
  PROPOSE_ACTION,
  REVISE_ACTION,
} from "../src/services/plan-revise";
import { DRAFT_TTL_MS } from "../src/services/revise/drafts";
import { DAILY_MEAL_DAY_LIMIT, MEAL_DAY_ACTION } from "../src/services/revise/limits";

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures += 1;
};

check(DAILY_REVISE_LIMIT === 4, "plan chat apply cap = 4/day");
check(DAILY_MEAL_REGEN_LIMIT === 2, "meal regen cap = 2/day");
check(REVISE_ACTION === "coach.revise", "plan meter action coach.revise");
check(MEAL_REGEN_ACTIONS.includes("meal_plan.generate"), "meal regen includes meal_plan.generate");
check(MEAL_REGEN_ACTIONS.includes("meal_plan.rebalance"), "meal regen includes meal_plan.rebalance");
check(DAILY_PROPOSE_LIMIT === 20, "plan chat propose cap = 20/day (AMI-171)");
check(PROPOSE_ACTION === "coach.revise.propose" && PROPOSE_ACTION !== REVISE_ACTION, "propose has its own meter key");
check(DRAFT_TTL_MS === 30 * 60 * 1000, "draft TTL = 30 min");
check(DAILY_MEAL_DAY_LIMIT === 2 && MEAL_DAY_ACTION === "coach.revise.meal_day" && !MEAL_REGEN_ACTIONS.includes(MEAL_DAY_ACTION), "chat whole-day redraft cap = 2/day, own meter (plan generation not counted)");

process.exit(failures === 0 ? 0 : 1);
