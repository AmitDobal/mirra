/**
 * Offline assertions (AMI-159): plan apply 4/day, meal regen 2/day, action keys.
 *   npm run test:revise-caps -w @mirra/api
 */
import { DAILY_MEAL_REGEN_LIMIT, MEAL_REGEN_ACTIONS } from "../src/services/meal-plan-draft";
import { DAILY_REVISE_LIMIT, REVISE_ACTION } from "../src/services/plan-revise";

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

process.exit(failures === 0 ? 0 : 1);
