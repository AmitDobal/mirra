import assert from "node:assert/strict";
import { test } from "node:test";

import { parseWeightInput, validWeightKg, weightInputText, weightRangeText } from "./body-weight-input";

test("imperial: typed lb is converted to kg for the API (QA iOS #82)", () => {
  assert.equal(parseWeightInput("168", "lb"), 76.2);
  assert.equal(parseWeightInput("181,5", "lb"), 82.33);
  assert.equal(validWeightKg("168", "lb"), 76.2);
  // 168 typed as kg would be accepted; as lb it must not be logged as 168 kg.
  assert.notEqual(validWeightKg("168", "lb"), 168);
});

test("metric: kg passes through unchanged", () => {
  assert.equal(parseWeightInput("75.2", "kg"), 75.2);
  assert.equal(validWeightKg("75.2", "kg"), 75.2);
});

test("prefill shows the user's unit to 0.1", () => {
  assert.equal(weightInputText(76.2, "lb"), "168");
  assert.equal(weightInputText(76, "lb"), "167.6");
  assert.equal(weightInputText(76, "kg"), "76");
  assert.equal(weightInputText(null, "lb"), "");
});

test("range check and message follow the unit", () => {
  assert.equal(validWeightKg("50", "lb"), null); // 22.7 kg < 30 kg
  assert.equal(validWeightKg("", "lb"), null);
  assert.equal(validWeightKg("abc", "kg"), null);
  assert.equal(weightRangeText("kg"), "30 and 400 kg");
  assert.equal(weightRangeText("lb"), "67 and 881 lb");
});
