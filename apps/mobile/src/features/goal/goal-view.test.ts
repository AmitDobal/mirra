import assert from "node:assert/strict";
import { test } from "node:test";

import type { GoalResponse } from "@mirra/contracts";

import { DAY35, START, day35, fixtureInput, responseOf } from "./goal-fixture";
import { actionLine, adherenceRows, buildGoalView, milestoneRow, statWeight } from "./goal-view";

const view = (body: GoalResponse | null, perWeek: number | null = 4) =>
  buildGoalView({ body, unit: "kg", sessionsPerWeek: perWeek });
const d35 = day35();
const v35 = view(d35);

test("day 35: hero ETA, on-track lime pill, eyebrow", () => {
  assert.equal(v35.layout, "eta");
  assert.equal(v35.headline, "Around Feb 18");
  assert.deepEqual(v35.status, { label: "On track", tone: "lime" });
  assert.equal(v35.eyebrow, "Lose fat · Steady");
});

test("day 35: range + moved-up line", () => {
  assert.equal(v35.sub, "Range Feb 11 – Mar 6 · moved up from Mar 6");
});

test("day 35: Start / Now / To go stats", () => {
  assert.deepEqual(v35.stats, [
    { label: "Start", value: "82.0 kg", detail: "Nov 4" },
    { label: "Now", value: "79.6 kg", detail: "7-day trend" },
    { label: "To go", value: "4.6 kg", detail: "−2.4 kg so far" },
  ]);
});

test("day 35: milestones in S44 wording with dates, lime goal marker", () => {
  const rows = v35.milestones;
  assert.deepEqual(rows.map((r) => r.title), ["First visible change", "Halfway", "5% of start", "Goal"]);
  assert.equal(rows[0]!.detail, "Often around here · −2.5 kg");
  assert.equal(rows[1]!.detail, "78.5 kg");
  assert.equal(rows[3]!.date, "Feb 18");
  assert.equal(rows[3]!.marker, "goal");
  assert.ok(rows.slice(0, 3).every((r) => r.marker === "open" && r.date !== null));
});

test("day 35: adherence rows as counts", () => {
  assert.deepEqual(v35.adherence, [
    { label: "Sessions", value: "12 / 16", ratio: 0.75 },
    { label: "Check-ins", value: "21 / 28", ratio: 0.75 },
    { label: "Fuel on target", value: "10 / 20 logged days", ratio: 0.5 },
  ]);
});

test("adherence falls back to percentages for bodies cached before counts existed", () => {
  const rows = adherenceRows({ ...d35.adherence, counts: undefined });
  assert.deepEqual(rows.map((r) => r.value), ["75%", "75%", "50%"]);
});

test("keep line uses planned sessions per week, else 28-day planned ÷ 4", () => {
  assert.equal(v35.action, "Keep 4 of 4 sessions this week to hold Feb 18.");
  assert.equal(actionLine(d35, null), "Keep 4 of 4 sessions this week to hold Feb 18.");
  assert.equal(actionLine(d35, 3), "Keep 3 of 3 sessions this week to hold Feb 18.");
});

test("chart: ETA week from the chart start, caption, kg target", () => {
  assert.ok(v35.chart);
  assert.ok(Math.abs(v35.chart.etaWeeks! - 106 / 7) < 1e-9);
  assert.equal(v35.chart.caption, "Last 5 weeks");
  assert.equal(v35.chart.data.targetKg, 75);
  assert.equal(v35.chart.data.todayIndex, 5);
});

test("S45/S46 card copy", () => {
  assert.deepEqual(v35.card, { title: "82 → 75 kg · Steady", sub: "Around Feb 18 · range Feb 11 – Mar 6" });
});

test("imperial user sees lb everywhere", () => {
  const v = view(responseOf(fixtureInput({ units: "imperial" })));
  assert.equal(v.unit, "lb");
  assert.equal(v.stats![0]!.value, "181 lb");
  assert.match(v.card.title, /^181 → 165 lb · Steady$/);
  assert.match(v.milestones.find((m) => m.id === "halfway")!.detail ?? "", /lb$/);
});

test("behind: neutral pill (never crimson) and one concrete next step", () => {
  const body: GoalResponse = { ...d35, status: "behind", whatIf: null };
  const v = view(body);
  assert.deepEqual(v.status, { label: "Behind", tone: "neutral" });
  assert.equal(v.action, "Next step: get 4 sessions in this week and log your weight.");
});

test("behind with a training what-if names the earlier date", () => {
  const body: GoalResponse = { ...d35, status: "behind", whatIf: { eta: "2027-02-04", lever: "training" } };
  assert.equal(view(body).action, "Hit 4 of 4 sessions each week: around Feb 4.");
  const fuel: GoalResponse = { ...body, whatIf: { eta: "2027-02-04", lever: "fuel" } };
  assert.equal(view(fuel).action, "Keep fuel on target most days: around Feb 4.");
});

test("trend reversed: honest 'if you get back on plan' line", () => {
  const body: GoalResponse = { ...d35, status: "behind", flags: ["trend_reversed"] };
  assert.equal(view(body).action, "Your trend moved the other way lately. If you get back on plan: around Feb 18.");
});

test("calibrating (day 7): lavender pill + firms-up notice", () => {
  const v = view(responseOf(fixtureInput({}, "2026-11-11")));
  assert.deepEqual(v.status, { label: "Calibrating", tone: "lavender" });
  assert.ok(v.notices.includes("Estimate firms up after two weeks of weigh-ins."));
  // Early what-if still names one lever (check-ins are the biggest gap on day 7).
  assert.match(v.action ?? "", /: around [A-Z][a-z]{2} \d+\.$/);
});

test("no goal weight: horizon layout with the Set a goal weight CTA", () => {
  const v = view(responseOf(fixtureInput({ targetWeightKg: null })));
  assert.equal(v.layout, "horizon");
  assert.equal(v.showSetGoal, true);
  assert.equal(v.headline, "No goal weight yet");
  assert.equal(v.stats, null);
  assert.equal(v.card.sub, "Set a goal weight to see a date");
  assert.equal(v.status.label, "No target");
  assert.equal(v.chart?.data.targetKg, null);
});

test("recomp without a goal weight: milestones-first hero", () => {
  const v = view(responseOf(fixtureInput({ goalType: "recomp", targetWeightKg: null })));
  assert.equal(v.layout, "milestones");
  assert.match(v.headline, /^Next: /);
  assert.equal(v.card.title, v.headline);
  assert.ok(v.milestones.length > 0);
});

test("no plan (not onboarded) → empty layout", () => {
  assert.equal(view(null).layout, "empty");
  assert.equal(view({ ...d35, plan: null }).layout, "empty");
});

test("ETA later than the original says 'moved from'", () => {
  const body: GoalResponse = { ...d35, plan: { ...d35.plan!, originalEta: "2027-02-01" } };
  assert.equal(view(body).sub, "Range Feb 11 – Mar 6 · moved from Feb 1");
  const same: GoalResponse = { ...d35, plan: { ...d35.plan!, originalEta: d35.band.expected } };
  assert.equal(view(same).sub, "Range Feb 11 – Mar 6");
});

test("flag notices reuse the onboarding copy", () => {
  const body: GoalResponse = { ...d35, flags: ["direction_mismatch", "kcal_floor"] };
  const v = view(body);
  assert.ok(v.notices[0]!.startsWith("Your goal weight is below today's weight"));
  assert.ok(v.notices.some((n) => n.includes("safe minimum")));
});

test("milestoneRow: strength rows get the hexagon marker, windows become ranges", () => {
  const s = milestoneRow({ id: "next_division", kind: "strength", label: "Bench press Silver I", detail: "80 kg × 8 for 2 sessions", date: "2026-12-16", window: null, done: false });
  assert.deepEqual(s, { id: "next_division", title: "Bench press Silver I", detail: "80 kg × 8 for 2 sessions", date: "Dec 16", marker: "strength" });
  const w = milestoneRow({ id: "strength_first", kind: "strength", label: "Strength usually climbs first", detail: "Weeks 2–6", date: null, window: [START, DAY35], done: true });
  assert.equal(w.date, "Nov 4 – Dec 9");
});

test("statWeight: kg keeps one decimal, lb whole", () => {
  assert.equal(statWeight(82, "kg"), "82.0 kg");
  assert.equal(statWeight(79.64, "kg"), "79.6 kg");
  assert.equal(statWeight(82, "lb"), "181 lb");
});
