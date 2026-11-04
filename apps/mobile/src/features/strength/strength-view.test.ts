import assert from "node:assert/strict";
import { test } from "node:test";

import type { MuscleStrengthResponse, StrengthOverviewResponse, TierStanding } from "@mirra/contracts";

import {
  bestSetText,
  formatLoad,
  groupRows,
  ladderRows,
  muscleDetailView,
  muscleForGroup,
  overallView,
  pickMuscle,
  placeOf,
  teaserView,
  tierSteps,
  unlockProgress,
} from "./strength-view.ts";

const st = (step: number, tier: TierStanding["tier"], division: TierStanding["division"], label: string, progressToNext: number | null = 0.6): TierStanding => ({
  step, tier, division, label, pct: 42, progressToNext,
});

const GOLD_III = st(9, "gold", 3, "Gold III");
const SILVER_II = st(7, "silver", 2, "Silver II");

const overview = (over: Partial<StrengthOverviewResponse> = {}): StrengthOverviewResponse => ({
  standardsVersion: "2026.11-v1",
  units: "imperial",
  needsBodyweight: false,
  overall: null,
  unlock: { ranked: 3, rankedNeeded: 8, groups: 2, groupsNeeded: 5 },
  groups: [
    { id: "chest", standing: GOLD_III },
    { id: "shoulders", standing: null },
    { id: "arms", standing: null },
    { id: "back", standing: SILVER_II },
    { id: "core", standing: null },
    { id: "legs", standing: null },
  ],
  muscles: [
    { id: "chest", standing: GOLD_III },
    { id: "lats", standing: SILVER_II },
    { id: "upper_back", standing: st(8, "silver", 1, "Silver I") },
    { id: "abs", standing: null },
  ],
  ...over,
});

test("placeOf maps API division 3 → III, Legendary → null division", () => {
  assert.deepEqual(placeOf(GOLD_III), { tier: "gold", division: "III" });
  assert.deepEqual(placeOf(st(21, "legendary", null, "Legendary", null)), { tier: "legendary", division: null });
  assert.equal(placeOf(null), null);
});

test("overall: locked shows lifts progress, then groups progress", () => {
  const v = overallView(overview());
  assert.equal(v.kind, "locked");
  assert.equal(v.sub, "Rank 8 lifts across 5 groups to unlock · 3/8");
  assert.equal(unlockProgress({ ranked: 9, rankedNeeded: 8, groups: 4, groupsNeeded: 5 }), "4/5 groups");
});

test("overall: ranked, empty, and bodyweight states", () => {
  const ranked = overallView(overview({ overall: SILVER_II, unlock: { ranked: 9, rankedNeeded: 8, groups: 5, groupsNeeded: 5 } }));
  assert.equal(ranked.kind, "ranked");
  assert.equal(ranked.title, "Silver II");
  assert.equal(ranked.sub, "From 9 ranked lifts across 5 groups");
  assert.equal(overallView(overview({ unlock: { ranked: 0, rankedNeeded: 8, groups: 0, groupsNeeded: 5 } })).kind, "empty");
  assert.equal(overallView(overview({ needsBodyweight: true, overall: SILVER_II })).kind, "bodyweight");
});

test("tierSteps keeps ranked muscles only; groupRows in S34 order", () => {
  assert.deepEqual(tierSteps(overview()), { chest: 9, lats: 7, upper_back: 8 });
  const rows = groupRows(overview());
  assert.deepEqual(rows.map((r) => r.name), ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core"]);
  assert.equal(rows[1]?.label, "Silver II");
  assert.equal(rows[5]?.label, "Unranked");
  assert.equal(rows[5]?.place, null);
});

test("pickMuscle prefers the highest ranked id, falls back to the first", () => {
  const steps = tierSteps(overview());
  assert.equal(pickMuscle(["lats", "upper_back"], steps), "upper_back");
  assert.equal(pickMuscle(["front_delts", "side_delts"], steps), "front_delts");
  assert.equal(muscleForGroup("back", steps), "upper_back");
  assert.equal(muscleForGroup("core", steps), "abs");
});

test("formatLoad + bestSetText respect units and bodyweight sets", () => {
  assert.equal(formatLoad(79.4, "imperial"), "175 lb");
  assert.equal(formatLoad(80, "metric"), "80 kg");
  assert.equal(formatLoad(22.4, "metric"), "22.5 kg");
  assert.equal(bestSetText({ weightKg: 79.4, reps: 8 }, "imperial"), "175 lb × 8");
  assert.equal(bestSetText({ weightKg: null, reps: 22 }, "imperial"), "bodyweight × 22");
  assert.equal(bestSetText(null, "metric"), null);
});

const chestDetail = (over: Partial<MuscleStrengthResponse> = {}): MuscleStrengthResponse => ({
  id: "chest",
  group: "chest",
  units: "imperial",
  standing: GOLD_III,
  next: { toLabel: "Gold II", exerciseId: "bench_press", exerciseName: "Barbell Bench Press", weightKg: 84, reps: 8, sessions: 2, display: "185 lb × 8" },
  contributors: [
    { exerciseId: "bench_press", name: "Barbell Bench Press", involvementPct: 70, sets90d: 12, standing: GOLD_III, bestSet: { weightKg: 79.4, reps: 8 } },
    { exerciseId: "tag:cable fly", name: "Cable Fly", involvementPct: 80, sets90d: 3, standing: null, bestSet: null },
  ],
  ...over,
});

test("muscle detail: progress, next set verbatim, contributors", () => {
  const v = muscleDetailView(chestDetail(), "Chest");
  assert.equal(v.title, "Gold III");
  assert.deepEqual(v.progress, { label: "Progress to Gold II", pct: 60 });
  assert.deepEqual(v.next, { display: "185 lb × 8", line: "Barbell Bench Press · 2 sessions → Gold II" });
  assert.equal(v.contributors[0]?.detail, "70% chest · best 175 lb × 8");
  assert.equal(v.contributors[1]?.label, "Unranked");
  assert.equal(v.contributors[1]?.detail, "80% chest");
  assert.equal(v.note, null);
});

test("muscle detail: unranked muscle and Legendary have no progress bar", () => {
  const un = muscleDetailView(chestDetail({ standing: null, next: null, contributors: [] }), "Front delts");
  assert.equal(un.progress, null);
  assert.equal(un.title, "Unranked");
  assert.equal(un.note, "Log a lift that trains front delts to rank it.");
  const top = muscleDetailView(chestDetail({ standing: st(21, "legendary", null, "Legendary", null), next: null }), "Chest");
  assert.equal(top.progress, null);
});

test("teaser: label when unlocked, Locked · n/8 otherwise", () => {
  assert.equal(teaserView(overview()).title, "Locked · 3/8");
  assert.equal(teaserView(overview({ overall: SILVER_II })).title, "Silver II");
  assert.equal(teaserView(null).place, null);
});

test("ladder: Legendary first, user's tier highlighted with own pips", () => {
  const rows = ladderRows(SILVER_II);
  assert.deepEqual(rows.map((r) => r.tier), ["legendary", "elite", "diamond", "platinum", "gold", "silver", "bronze", "iron"]);
  assert.equal(rows[0]?.right, "Top tier");
  assert.equal(rows[0]?.pips, 0);
  const silver = rows.find((r) => r.tier === "silver");
  assert.deepEqual(silver, { tier: "silver", current: true, pips: 2, right: "You · Silver II" });
  assert.equal(rows.find((r) => r.tier === "gold")?.right, "III · II · I");
  assert.equal(ladderRows(null).some((r) => r.current), false);
});
