import assert from "node:assert/strict";
import { test } from "node:test";

import { heightA11y, heightDisplay, stepHeightCm } from "./height-input";

test("ft shows feet and inches, not decimal feet (QA X4: 175 cm was \"5.7\")", () => {
  assert.equal(heightDisplay(175, "ft"), `5'9"`);
  assert.equal(heightDisplay(180.3, "ft"), `5'11"`);
  assert.equal(heightDisplay(182.5, "ft"), `6'0"`);
  assert.equal(heightDisplay(175, "cm"), "175");
  assert.equal(heightA11y(175, "ft"), "5 feet 9 inches");
});

test("ft stepper moves one inch and stores cm", () => {
  assert.equal(stepHeightCm(175, "ft", 1), 177.8); // 5'9" → 5'10"
  assert.equal(stepHeightCm(175, "ft", -1), 172.7); // 5'9" → 5'8"
  assert.equal(heightDisplay(stepHeightCm(180.3, "ft", 1), "ft"), `6'0"`); // 5'11" rolls over
  assert.equal(heightDisplay(stepHeightCm(182.9, "ft", -1), "ft"), `5'11"`);
});

test("cm stepper keeps 1 cm steps and the 120-230 bounds", () => {
  assert.equal(stepHeightCm(175, "cm", 1), 176);
  assert.equal(stepHeightCm(177.8, "cm", -1), 177);
  assert.equal(stepHeightCm(120, "cm", -1), 120);
  assert.equal(stepHeightCm(230, "cm", 1), 230);
  assert.equal(stepHeightCm(229.9, "ft", 1), 229.9); // 7'7" + 1 in > 230 cm: stays
});
