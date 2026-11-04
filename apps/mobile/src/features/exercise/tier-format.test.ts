import assert from "node:assert/strict";
import { test } from "node:test";

import type { ApiTierChange, ApiTierStanding } from "../../lib/api/strength-exercise.ts";
import {
  changesCopy,
  fromCopy,
  MAX_TIER_ROWS,
  nextCopy,
  orderTierChanges,
  placeOf,
  progressCopy,
  progressPct,
  tierCardCopy,
  transitionCopy,
} from "./tier-format.ts";

const st = (step: number, tier: ApiTierStanding["tier"], division: 1 | 2 | 3 | null, label: string, p: number | null = 0.6): ApiTierStanding => ({
  step,
  tier,
  division,
  label,
  pct: 50,
  progressToNext: p,
});

const GOLD_III = st(9, "gold", 3, "Gold III");
const SILVER_I = st(8, "silver", 1, "Silver I");

test("API division numbers map to badge divisions", () => {
  assert.deepEqual(placeOf(GOLD_III), { tier: "gold", division: "III" });
  assert.deepEqual(placeOf(st(10, "gold", 2, "Gold II")), { tier: "gold", division: "II" });
  assert.deepEqual(placeOf(SILVER_I), { tier: "silver", division: "I" });
  assert.deepEqual(placeOf(st(21, "legendary", null, "Legendary", null)), { tier: "legendary", division: null });
});

test("S36 tier card copy", () => {
  assert.equal(progressCopy(GOLD_III), "60% to Gold II");
  assert.equal(progressPct(GOLD_III), 60);
  assert.equal(progressCopy(st(21, "legendary", null, "Legendary", null)), "Top tier");
  assert.equal(progressPct(st(21, "legendary", null, "Legendary", null)), 100);
  const next = { toLabel: "Gold II", exerciseId: "bench_press", exerciseName: "Barbell Bench Press", weightKg: 84, reps: 8, sessions: 2, display: "185 lb × 8" };
  assert.equal(nextCopy(next), "Next: 185 lb × 8 for 2 sessions → Gold II");
  assert.equal(nextCopy({ ...next, sessions: 1 }), "Next: 185 lb × 8 for 1 session → Gold II");

  const ranked = tierCardCopy({ ranked: true, standing: GOLD_III, next });
  assert.equal(ranked.kind, "ranked");
  assert.equal(ranked.kind === "ranked" && ranked.next, "Next: 185 lb × 8 for 2 sessions → Gold II");
});

test("unranked lifts never pretend to have a tier", () => {
  const tag = tierCardCopy({ ranked: false, standing: null, next: null });
  assert.equal(tag.kind, "unranked");
  assert.equal(tag.kind === "unranked" && tag.title, "Unranked lift");
  assert.equal(tierCardCopy(null).kind, "unranked");
  const noSets = tierCardCopy({ ranked: true, standing: null, next: null });
  assert.equal(noSets.kind === "unranked" && noSets.title, "Unranked");
});

test("tier changes: overall first, stable, max 6", () => {
  const ch = (scope: ApiTierChange["scope"], name: string, from: ApiTierStanding | null = SILVER_I): ApiTierChange => ({
    scope,
    refId: name.toLowerCase(),
    name,
    from,
    to: GOLD_III,
  });
  const ordered = orderTierChanges([
    ch("exercise", "Barbell Bench Press"),
    ch("muscle", "Chest"),
    ch("overall", "Overall"),
    ch("exercise", "Incline Dumbbell Press"),
    ch("group", "Chest group"),
    ch("muscle", "Triceps"),
    ch("exercise", "Dips"),
  ]);
  assert.equal(ordered.length, MAX_TIER_ROWS);
  assert.deepEqual(
    ordered.map((c) => c.name),
    ["Overall", "Chest group", "Chest", "Triceps", "Barbell Bench Press", "Incline Dumbbell Press"],
  );
  assert.deepEqual(orderTierChanges(undefined), []);
  // Chest group and chest muscle with the same move collapse to one row.
  assert.deepEqual(
    orderTierChanges([ch("muscle", "Chest"), ch("group", "Chest"), ch("muscle", "Chest", null)]).map((c) => c.scope),
    ["group", "muscle"],
  );
  assert.equal(transitionCopy(ch("muscle", "Chest")), "Silver I → Gold III");
  assert.equal(transitionCopy(ch("muscle", "Chest", null)), "Unranked → Gold III");
  assert.equal(fromCopy(ch("overall", "Overall", st(6, "silver", 3, "Silver III"))), "from Silver III");
  assert.equal(fromCopy(ch("overall", "Overall", null)), "First rank");
  assert.equal(changesCopy(3), "3 changes");
  assert.equal(changesCopy(1), "1 change");
});
