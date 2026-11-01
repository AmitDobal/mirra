/** Unit checks for history windows + heuristic MealEstimator v2 (no DB, no network). Run: npm run test:nutrition -w @mirra/api */
import assert from "node:assert/strict";

import { heuristicMealEstimator } from "../src/adapters/heuristic-meal-estimator";
import { historyWindow } from "../src/lib/history-window";

const week = historyWindow("week", "2026-11-01");
assert.equal(week.from, "2026-10-26");
assert.equal(week.to, "2026-11-01");
assert.equal(week.dates.length, 7);
console.log("ok  week window Monday-Sunday");

assert.equal(historyWindow("month", "2026-02-10").dates.length, 28);
assert.equal(historyWindow("month", "2028-02-10").dates.length, 29);
assert.equal(historyWindow("month", "2026-12-31").to, "2026-12-31");
assert.equal(historyWindow("day", "2026-11-01").dates.length, 1);
console.log("ok  month / day windows");

const run = async () => {
  const r = await heuristicMealEstimator.estimate({ userId: "u", description: "pizza" });
  assert.equal(r.source, "heuristic");
  assert.ok(r.ingredients.length > 0 && r.warnings.length > 0);
  assert.ok(r.fiberG != null && r.sugarG != null && r.sodiumMg != null);
  console.log("ok  heuristic v2 fields");
};
void run();
