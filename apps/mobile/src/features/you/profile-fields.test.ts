import assert from "node:assert/strict";
import { test } from "node:test";

import { draftToPatch, fieldSpec, initialDraft, isSheetField } from "./profile-fields";

test("diet / cuisines / avoid route to DietPrefsSheet, not the profile sheet", () => {
  assert.equal(isSheetField("dietTags"), false);
  assert.equal(isSheetField("foodsAvoid"), false);
  assert.equal(isSheetField("ageYears"), true);
});

test("age: clamps to contract range, integer", () => {
  assert.deepEqual(draftToPatch("ageYears", "metric", { num: 31 }), { ageYears: 31 });
  assert.deepEqual(draftToPatch("ageYears", "metric", { num: 9 }), { ageYears: 13 });
  assert.equal(draftToPatch("ageYears", "metric", { num: null }), null);
});

test("height: imperial ft/in and metric cm both store cm", () => {
  assert.equal(fieldSpec("heightCm", "imperial").kind, "height");
  assert.deepEqual(initialDraft("heightCm", "imperial", { heightCm: 180.3 }, null), { ft: 5, inch: 11 });
  assert.deepEqual(draftToPatch("heightCm", "imperial", { ft: 5, inch: 11 }), { heightCm: 180.3 });
  assert.deepEqual(draftToPatch("heightCm", "metric", { num: 172.4 }), { heightCm: 172 });
});

test("goal weight: lb shown, kg stored; clearable", () => {
  assert.deepEqual(initialDraft("goalWeightKg", "imperial", { goalWeightKg: 78 }, null), { num: 172 });
  assert.deepEqual(draftToPatch("goalWeightKg", "imperial", { num: 172 }), { goalWeightKg: 78 });
  assert.deepEqual(draftToPatch("goalWeightKg", "metric", { num: null }), { goalWeightKg: null });
});

test("training days need at least one, sorted numbers", () => {
  assert.equal(draftToPatch("trainDays", "metric", { multi: [] }), null);
  assert.deepEqual(draftToPatch("trainDays", "metric", { multi: [6, 2, 4] }), { trainDays: [2, 4, 6] });
});

test("choices: physique clears to null, goal requires a pick", () => {
  assert.deepEqual(draftToPatch("physiqueTarget", "metric", { choice: null }), { physiqueTarget: null });
  assert.equal(draftToPatch("primaryGoal", "metric", { choice: null }), null);
  assert.deepEqual(draftToPatch("sessionMinutes", "metric", { choice: 60 }), { sessionMinutes: 60 });
  assert.deepEqual(draftToPatch("units", "metric", { choice: "imperial" }), { units: "imperial" });
});

test("about your days trims, empty clears", () => {
  assert.deepEqual(draftToPatch("lifestyleNotes", "metric", { text: "  Desk 9-6 " }), { lifestyleNotes: "Desk 9-6" });
  assert.deepEqual(draftToPatch("lifestyleNotes", "metric", { text: "   " }), { lifestyleNotes: null });
});
