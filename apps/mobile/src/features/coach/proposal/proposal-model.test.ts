import assert from "node:assert/strict";
import { test } from "node:test";

import { planChatCopy as l } from "../../../content/plan-chat.ts";
import type { ReviseItem } from "../../../lib/api/coach-revise.ts";
import {
  buildProposalSections,
  mealDeltaReason,
  previewReplyText,
  rowOfItem,
  stripPreviewPrefix,
} from "./proposal-model.ts";

const base = { tags: [] as string[], reason: null };
const push = { workoutId: "w1", dayLabel: "Thu · Push day" };
const dips = { name: "Tricep Dips", sets: 3, reps: "8-10", canonicalId: "dip" };
const skull = { name: "Skull Crusher", sets: 3, reps: "8-10", canonicalId: "skull_crusher" };
const wrap = { name: "Chicken Caesar wrap", kcal: 640, proteinG: 30, carbsG: 70, fatG: 22 };
const bowl = { name: "Salmon rice bowl", kcal: 610, proteinG: 42, carbsG: 50, fatG: 20 };

const row = (item: ReviseItem) => rowOfItem(item, l);

test("meal_swap: struck before + kcal pill, after + tags, server reason", () => {
  const r = row({
    ...base,
    id: "meal:lunch",
    kind: "meal_swap",
    slot: "lunch",
    before: wrap,
    after: bowl,
    delta: { kcal: -30, proteinG: 12, carbsG: -20, fatG: -2 },
    tags: ["Target intact"],
    reason: "+12g protein · −20g carbs · 610 kcal",
  });
  assert.deepEqual(r, {
    key: "meal:lunch",
    variant: "swap",
    before: "Before: Lunch · Chicken Caesar wrap",
    beforePill: "640 kcal",
    after: "After: Lunch · Salmon rice bowl",
    tags: ["Target intact"],
    reason: "+12g protein · −20g carbs · 610 kcal",
  });
});

test("meal_swap without server reason derives the macro delta line", () => {
  const delta = { kcal: -30, proteinG: 12, carbsG: -20, fatG: -2 };
  assert.equal(mealDeltaReason(delta, bowl), "−20g carbs · +12g protein · 610 kcal");
  const r = row({ ...base, id: "m", kind: "meal_swap", slot: "dinner", before: wrap, after: bowl, delta });
  assert.equal(r.variant === "swap" && r.reason, "−20g carbs · +12g protein · 610 kcal");
});

test("meal_add: after-only row with Add label", () => {
  const r = row({ ...base, id: "a", kind: "meal_add", slot: "snack", after: bowl, tags: ["New meal"] });
  assert.equal(r.variant, "add");
  assert.equal(r.variant === "add" && r.after, "Add: Snack · Salmon rice bowl");
  assert.equal(r.variant === "add" && r.reason, "610 kcal · 42g protein");
  assert.deepEqual(r.variant === "add" && r.tags, ["New meal"]);
});

test("meal_remove: struck row with kcal pill", () => {
  const r = row({ ...base, id: "r", kind: "meal_remove", slot: "breakfast", before: wrap });
  assert.equal(r.variant, "remove");
  assert.equal(r.variant === "remove" && r.before, "Remove: Breakfast · Chicken Caesar wrap");
  assert.equal(r.variant === "remove" && r.beforePill, "640 kcal");
});

test("exercise_swap: name · sets×reps, tags, reason", () => {
  const r = row({
    ...push,
    id: "x",
    kind: "exercise_swap",
    before: dips,
    after: skull,
    tags: ["Same muscles"],
    reason: "Trains triceps without a dip station",
  });
  assert.equal(r.variant === "swap" && r.before, "Before: Tricep Dips · 3×8-10");
  assert.equal(r.variant === "swap" && r.after, "After: Skull Crusher · 3×8-10");
  assert.equal(r.variant === "swap" && r.beforePill, null);
  assert.equal(r.variant === "swap" && r.reason, "Trains triceps without a dip station");
});

test("exercise_add and exercise_remove", () => {
  const add = row({ ...base, ...push, id: "a", kind: "exercise_add", after: skull, position: 2, tags: ["Dumbbells"] });
  assert.equal(add.variant === "add" && add.after, "Add: Skull Crusher · 3×8-10");
  const rm = row({ ...base, ...push, id: "r", kind: "exercise_remove", before: dips, reason: "Saves 6 min" });
  assert.equal(rm.variant === "remove" && rm.before, "Remove: Tricep Dips · 3×8-10");
  assert.equal(rm.variant === "remove" && rm.reason, "Saves 6 min");
});

test("pref: explicit label, no fake before", () => {
  const r = row({ ...base, id: "p", kind: "pref", op: "avoid", label: "Avoid", items: ["chicken", "dairy"] });
  assert.deepEqual(r, { key: "p", variant: "single", text: "Avoid: chicken, dairy", tags: [] });
});

test("session_minutes: 45 min → 30 min with dropped exercises reason", () => {
  const r = row({ ...base, id: "s", kind: "session_minutes", before: 45, after: 30, droppedExercises: ["Face pull"] });
  assert.equal(r.variant === "swap" && r.before, "Before: Session · 45 min");
  assert.equal(r.variant === "swap" && r.after, "After: Session · 30 min");
  assert.equal(r.variant === "swap" && r.reason, "Drops Face pull");
});

test("meals_per_day pluralizes", () => {
  const r = row({ ...base, id: "n", kind: "meals_per_day", before: 4, after: 1 });
  assert.equal(r.variant === "swap" && r.before, "Before: 4 meals a day");
  assert.equal(r.variant === "swap" && r.after, "After: 1 meal a day");
});

test("schedule_day_move: day · title", () => {
  const r = row({
    ...base,
    id: "d",
    kind: "schedule_day_move",
    workoutId: "w1",
    title: "Push day",
    fromDate: "2026-11-03",
    toDate: "2026-11-05",
    fromLabel: "Tue",
    toLabel: "Thu",
  });
  assert.equal(r.variant === "swap" && r.before, "Before: Tue · Push day");
  assert.equal(r.variant === "swap" && r.after, "After: Thu · Push day");
});

test("items group in S39 order with workout day subtitle", () => {
  const sections = buildProposalSections(
    {
      changes: [],
      items: [
        { ...base, id: "p", kind: "pref", op: "avoid", label: "Avoid", items: ["chicken"] },
        { ...base, id: "m", kind: "meals_per_day", before: 4, after: 3 },
        { ...base, ...push, id: "x", kind: "exercise_swap", before: dips, after: skull },
        { ...base, id: "s", kind: "session_minutes", before: 45, after: 30, droppedExercises: [] },
      ],
    },
    l,
  );
  assert.deepEqual(
    sections.map((s) => [s.title, s.subtitle, s.rows.length]),
    [
      ["WORKOUT REVISION", "Thu · Push day", 2],
      ["MEAL ADJUSTMENT", null, 1],
      ["PLAN PREFERENCES", null, 1],
    ],
  );
});

test("legacy changes: structured, arrow summary, summary-only", () => {
  const sections = buildProposalSections(
    {
      changes: [
        { kind: "foods_avoid", area: "meal", before: "nothing", after: "dairy", summary: "x" },
        { kind: "workout_swap", summary: "Lat pulldown → Pull-up" },
        { kind: "pref_avoid", area: "prefs", summary: "Avoid: chicken" },
        { kind: "schedule_move", area: "workout", before: "Push on Tue", after: "Push on Thu", summary: "x" },
      ],
    },
    l,
  );
  assert.deepEqual(
    sections.map((s) => s.title),
    ["WORKOUT REVISION", "MEAL ADJUSTMENT", "SCHEDULE", "PLAN PREFERENCES"],
  );
  const w = sections[0]!.rows[0]!;
  assert.equal(w.variant === "swap" && w.before, "Before: Lat pulldown");
  assert.equal(w.variant === "swap" && w.after, "After: Pull-up");
  assert.deepEqual(sections[3]!.rows[0], { key: "pref_avoid-2", variant: "single", text: "Avoid: chicken", tags: [] });
});

test("empty items fall back to changes; none → no sections; preview prefix stripped", () => {
  assert.deepEqual(buildProposalSections({ items: [], changes: [] }, l), []);
  assert.equal(stripPreviewPrefix("Preview: Done."), "Done.");
});

test("preview reply never says Done before apply (S39 copy); plain replies pass through", () => {
  const legacy = "Preview: Done, recruit. Now swapping your lunch.";
  assert.equal(previewReplyText(legacy, true, l.preview), "Here is the change. Nothing updates until you apply.");
  assert.doesNotMatch(previewReplyText(legacy, true, l.preview), /\bdone\b/i);
  assert.equal(previewReplyText("Preview: I couldn't map that.", false, l.preview), "I couldn't map that.");
});
