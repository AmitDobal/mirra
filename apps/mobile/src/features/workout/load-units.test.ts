import assert from "node:assert/strict";
import { test } from "node:test";

import {
  formatLoad,
  fromDisplayLoad,
  KG_PER_LB,
  loadLabel,
  loadStepKg,
  toDisplayLoad,
  unitFor,
} from "./load-units.ts";

test("bodyweight lifts read '+ kg added' / '+ lb added'", () => {
  assert.equal(loadLabel("kg", "bodyweight"), "+ kg added");
  assert.equal(loadLabel("lb", "bodyweight"), "+ lb added");
  assert.equal(loadLabel("kg", "load"), "KG");
  assert.equal(loadLabel("lb", "load"), "LB");
  assert.equal(loadLabel("kg", null), "KG");
});

test("dumbbell lifts say the load is per hand (AMI-183)", () => {
  assert.equal(loadLabel("kg", "load", true), "KG PER HAND");
  assert.equal(loadLabel("lb", "load", true), "LB PER HAND");
  assert.equal(loadLabel("kg", "load", false), "KG");
  assert.equal(loadLabel("kg", "bodyweight", true), "+ kg added");
});

test("units preference → stepper unit", () => {
  assert.equal(unitFor("imperial"), "lb");
  assert.equal(unitFor("metric"), "kg");
  assert.equal(unitFor(null), "kg");
});

test("lb display round-trips through kg storage", () => {
  assert.equal(toDisplayLoad(100, "kg"), 100);
  assert.equal(fromDisplayLoad(100, "kg"), 100);
  const kg = Math.round(fromDisplayLoad(185, "lb") * 100) / 100;
  assert.equal(toDisplayLoad(kg, "lb"), 185);
  let stored = 0;
  for (let i = 0; i < 9; i += 1) stored = Math.round((stored + loadStepKg("lb")) * 100) / 100;
  assert.equal(toDisplayLoad(stored, "lb"), 45, "nine 5 lb taps");
  assert.equal(loadStepKg("kg"), 2.5);
  assert.equal(formatLoad(20 * KG_PER_LB * 10, "lb"), "200");
  assert.equal(formatLoad(82.5, "kg"), "82.5");
});
