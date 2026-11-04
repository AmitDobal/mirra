import assert from "node:assert/strict";
import { test } from "node:test";

import { previewGoal, type GoalPreviewAnswers } from "@mirra/contracts";

import { buildGoalChartModel, monthLabels, sampleSeries, type GoalChartData, MONTH_GAP } from "./goal-chart-model";

const TODAY = "2026-11-04";
const fixture: GoalPreviewAnswers = {
  profile: { sex: "male", ageYears: 29, heightCm: 180, weightKg: 82, goalWeightKg: 75, pace: "steady" },
  preferences: { primaryGoal: "lose_fat", experience: "months", trainDays: [1, 2, 4, 5], units: "metric" },
};
const chartOf = (a: GoalPreviewAnswers): GoalChartData => {
  const c = previewGoal(a, TODAY).chart;
  assert.ok(c);
  return c;
};
const base = chartOf(fixture);
const today = (w: string) => `Today ${w}`;
const goal = (w: string) => `Goal ${w}`;
const model = (data: GoalChartData, width = 326, extra: Partial<Parameters<typeof buildGoalChartModel>[0]> = {}) =>
  buildGoalChartModel({ data, width, height: 140, variant: "onboarding", etaWeeks: 17.5, todayLabel: today, goalLabel: goal, ...extra });
const nums = (d: string | null) => (d ?? "").match(/-?\d+(\.\d+)?/g)!.map(Number);

test("y scale: start weight on top, goal at the bottom for a cut", () => {
  const m = model(base);
  assert.equal(m.todayDot!.y, 22);
  assert.equal(m.target!.y, 140 - 30);
});

test("y scale flips for a gain (start low, goal high)", () => {
  const m = model(chartOf({ ...fixture, profile: { ...fixture.profile, goalWeightKg: 86 }, preferences: { ...fixture.preferences, primaryGoal: "build_muscle" } }), 326, { etaWeeks: 18.7 });
  assert.ok(m.todayDot!.y > m.target!.y);
  // Gain: label beside the dot, not above it where the line climbs.
  assert.ok(m.todayDot!.label!.x > m.todayDot!.x);
});

test("x scale: week 0 at the left pad, last week at the right edge", () => {
  const m = model(base);
  const band = nums(m.band);
  assert.equal(band[0], 36);
  assert.equal(Math.max(...band.filter((_, i) => i % 2 === 0)), 326 - 8);
});

test("band is one closed path: optimistic out, conservative back", () => {
  const m = model(base);
  assert.match(m.band!, /^M.* Z$/);
  assert.equal((m.band!.match(/[ML]/g) ?? []).length, base.optimistic.length + base.conservative.length);
});

test("expected line stops at the ETA on the goal line", () => {
  const m = model(base);
  assert.ok(m.expectedEnd);
  assert.ok(Math.abs(m.expectedEnd!.y - m.target!.y) < 0.01);
  const xs = nums(m.expected).filter((_, i) => i % 2 === 0);
  assert.ok(Math.abs(Math.max(...xs) - m.expectedEnd!.x) < 0.1);
  assert.ok(m.expectedEnd!.x < 326 - 8);
});

test("labels: today, goal and y ticks in kg", () => {
  const m = model(base);
  assert.equal(m.todayDot!.label!.text, "Today 82 kg");
  assert.ok(m.todayDot!.label!.y < m.todayDot!.y);
  assert.equal(m.target!.label!.text, "Goal 75 kg");
  assert.deepEqual(m.yLabels.map((l) => l.text), ["82", "75"]);
});

test("lb conversion: labels in lb, geometry unchanged", () => {
  const lb = model({ ...base, unit: "lb" });
  const kg = model(base);
  assert.equal(lb.todayDot!.label!.text, "Today 181 lb");
  assert.equal(lb.target!.label!.text, "Goal 165 lb");
  assert.deepEqual(lb.yLabels.map((l) => l.text), ["181", "165"]);
  assert.equal(lb.band, kg.band);
});

test("fixture months at 326 pt: NOV … APR", () => {
  assert.deepEqual(model(base).xLabels.map((l) => l.text), ["NOV", "DEC", "JAN", "FEB", "MAR", "APR"]);
});

test("label thinning: 2-year line keeps MONTH_GAP at 390 and 320 pt", () => {
  const long: GoalChartData = { ...base, planned: Array.from({ length: 105 }, (_, i) => 120 - i * 0.2), optimistic: [], conservative: [] };
  const at = (w: number) => model(long, w, { etaWeeks: null }).xLabels;
  for (const w of [390, 320]) {
    const xs = at(w).map((l) => l.x);
    for (let i = 1; i < xs.length; i += 1) assert.ok(xs[i]! - xs[i - 1]! >= MONTH_GAP - 0.5, `gap at ${w}`);
  }
  assert.ok(at(320).length <= at(390).length);
  assert.ok(at(390).length >= 6);
});

test("monthLabels: short span keeps every month", () => {
  const ls = monthLabels("2026-11-04", 12, (w) => w * 30, 0);
  assert.deepEqual(ls.map((l) => l.text), ["NOV", "DEC", "JAN"]);
});

test("empty series: no paths, no crash", () => {
  const m = model({ ...base, planned: [], optimistic: [], conservative: [], targetKg: null, actual: [] });
  assert.equal(m.band, null);
  assert.equal(m.expected, null);
  assert.equal(m.todayDot, null);
  assert.deepEqual(m.xLabels, []);
});

test("single point: finite geometry", () => {
  const m = model({ ...base, planned: [82], optimistic: [82], conservative: [82], targetKg: null }, 326, { etaWeeks: null });
  for (const v of nums(m.band)) assert.ok(Number.isFinite(v));
  assert.equal(m.todayDot!.y, 22 + (140 - 22 - 30) / 2);
});

test("hold (no target): no goal line, flat band", () => {
  const m = model(chartOf({ ...fixture, profile: { ...fixture.profile, goalWeightKg: null }, preferences: { ...fixture.preferences, primaryGoal: "recomp" } }), 326, { etaWeeks: null });
  assert.equal(m.target, null);
  assert.equal(m.expectedEnd, null);
  assert.deepEqual(m.yLabels.map((l) => l.text), ["82"]);
});

test("full variant: actual dots, trend path and today hairline", () => {
  const data: GoalChartData = {
    ...base,
    todayIndex: 2,
    actual: [
      { date: "2026-11-04", kg: 82, trendKg: 82 },
      { date: "2026-11-11", kg: 81.2, trendKg: 81.6 },
      { date: "2026-11-18", kg: 81, trendKg: 81.3 },
    ],
  };
  const m = buildGoalChartModel({ data, width: 350, height: 180, variant: "full", etaWeeks: 17.5 });
  assert.equal(m.dots.length, 3);
  assert.ok(m.dots[1]!.x > m.dots[0]!.x);
  assert.match(m.trend!, /^M/);
  assert.equal(m.todayLine, m.dots[2]!.x);
  assert.equal(m.todayDot, null);
});

test("spark variant: no labels, tight pads", () => {
  const m = buildGoalChartModel({ data: base, width: 120, height: 56, variant: "spark", etaWeeks: 17.5, goalLabel: goal });
  assert.deepEqual(m.xLabels, []);
  assert.deepEqual(m.yLabels, []);
  assert.equal(m.target!.label, null);
  assert.equal(nums(m.band)[0], 4);
});

test("sampleSeries interpolates and clamps", () => {
  assert.equal(sampleSeries([], 1), null);
  assert.equal(sampleSeries([10, 20], 0.5), 15);
  assert.equal(sampleSeries([10, 20], 5), 20);
  assert.equal(sampleSeries([10, 20], -1), 10);
});
