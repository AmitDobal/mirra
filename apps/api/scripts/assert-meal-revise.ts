/**
 * Offline assertions (AMI-153): meals-per-day intent parsing + slot mapping.
 *   npm run test:meal-revise -w @mirra/api
 */
import { heuristicPlanReviser } from "../src/adapters/heuristic-plan-reviser";
import { slotsForMealCount } from "../src/lib/meal-slots";
import type { PlanReviseInput } from "../src/ports/plan-reviser";

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures += 1;
};

const base: PlanReviseInput = {
  userId: "u", message: "", scope: "auto", equipment: [], dietTags: [], foodsAvoid: null, cuisineStyles: [],
  workoutTitle: null, exerciseNames: [], mealsPerDay: null, meals: [],
  nutrition: { goal: null, kcalTarget: null, proteinGTarget: null, lifestyleNotes: null },
};
const parse = async (message: string) => (await heuristicPlanReviser.propose({ ...base, message })).intent.mealsPerDay;

const cases: [string, number | undefined][] = [
  ["I only eat two times a day", 2],
  ["I eat 2 meals a day", 2],
  ["just 3 meals a day please", 3],
  ["i eat twice a day", 2],
  ["eat once a day", 1],
  ["4 meals/day", 4],
  ["cut me down to 3 meals", 3],
  ["I train twice a day", undefined],
  ["no dairy", undefined],
  ["shorter session 30 min", undefined],
];

const main = async () => {
  for (const [msg, want] of cases) check((await parse(msg)) === want, `"${msg}" -> ${want ?? "none"}`);
  check(slotsForMealCount(2).join() === "lunch,dinner", "2 meals = lunch,dinner");
  check(slotsForMealCount(3).join() === "breakfast,lunch,dinner", "3 meals = breakfast,lunch,dinner");
  check(slotsForMealCount(null).length === 4 && slotsForMealCount(9).length === 4, "default/clamped = 4 slots");
  check(slotsForMealCount(1).join() === "dinner", "1 meal = dinner");
  process.exit(failures === 0 ? 0 : 1);
};
void main();
