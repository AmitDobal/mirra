import assert from "node:assert/strict";
import { test } from "node:test";

import { buildProposalSections, stripPreviewPrefix } from "./proposal-rows.ts";

test("uses structured before/after and groups by area in stable order", () => {
  const sections = buildProposalSections([
    { kind: "foods_avoid", area: "meal", before: "nothing", after: "dairy", summary: "Avoiding: dairy" },
    { kind: "workout_swap", area: "workout", before: "Cable fly", after: "Dumbbell fly", summary: "x" },
  ]);
  assert.deepEqual(
    sections.map((s) => s.title),
    ["WORKOUT REVISION", "MEAL ADJUSTMENT"],
  );
  assert.deepEqual(sections[0]!.rows[0], { key: "workout_swap-1", before: "Cable fly", after: "Dumbbell fly" });
});

test("falls back to arrow summaries and kind-derived areas", () => {
  const [section] = buildProposalSections([{ kind: "workout_swap", summary: "Lat pulldown → Pull-up" }]);
  assert.equal(section!.area, "workout");
  assert.equal(section!.rows[0]!.before, "Lat pulldown");
  assert.equal(section!.rows[0]!.after, "Pull-up");
});

test("summary without arrow becomes an after-only row", () => {
  const [section] = buildProposalSections([{ kind: "meal_regen", summary: "Meals would be rebuilt" }]);
  assert.equal(section!.area, "meal");
  assert.deepEqual(section!.rows[0], { key: "meal_regen-0", before: null, after: "Meals would be rebuilt" });
});

test("no changes → no sections; preview prefix stripped", () => {
  assert.deepEqual(buildProposalSections([]), []);
  assert.equal(stripPreviewPrefix("Preview: Done."), "Done.");
});
