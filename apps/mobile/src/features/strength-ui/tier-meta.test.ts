import assert from "node:assert/strict";
import { test } from "node:test";

import { color } from "../../theme/tokens.ts";
import {
  labelOfStep,
  MAX_STEP,
  pipCount,
  stepOf,
  STEP_COUNT,
  TIER_IDS,
  tierColor,
  tierOfStep,
} from "./tier-meta.ts";

const EXPECTED = [
  "Iron III", "Iron II", "Iron I",
  "Bronze III", "Bronze II", "Bronze I",
  "Silver III", "Silver II", "Silver I",
  "Gold III", "Gold II", "Gold I",
  "Platinum III", "Platinum II", "Platinum I",
  "Diamond III", "Diamond II", "Diamond I",
  "Elite III", "Elite II", "Elite I",
  "Legendary",
];

test("22 steps label in ladder order", () => {
  assert.equal(STEP_COUNT, 22);
  assert.deepEqual(
    Array.from({ length: STEP_COUNT }, (_, s) => labelOfStep(s)),
    EXPECTED,
  );
});

test("anchor steps from the ticket", () => {
  assert.deepEqual(tierOfStep(0), { tier: "iron", division: "III" });
  assert.deepEqual(tierOfStep(9), { tier: "gold", division: "III" });
  assert.deepEqual(tierOfStep(20), { tier: "elite", division: "I" });
  assert.deepEqual(tierOfStep(21), { tier: "legendary", division: null });
});

test("out-of-range steps clamp", () => {
  assert.equal(labelOfStep(-4), "Iron III");
  assert.equal(labelOfStep(99), "Legendary");
  assert.equal(labelOfStep(Number.NaN), "Iron III");
  assert.equal(labelOfStep(10.9), "Gold II");
});

test("stepOf inverts tierOfStep", () => {
  for (let s = 0; s <= MAX_STEP; s += 1) {
    const { tier, division } = tierOfStep(s);
    assert.equal(stepOf(tier, division), s);
  }
});

test("pips: III = 1, II = 2, I = 3, Legendary = 0", () => {
  assert.equal(pipCount("III"), 1);
  assert.equal(pipCount("II"), 2);
  assert.equal(pipCount("I"), 3);
  assert.equal(pipCount(null), 0);
});

test("tier colors come from theme tier tokens", () => {
  for (const t of TIER_IDS) assert.equal(tierColor(t), color.tier[t]);
});
