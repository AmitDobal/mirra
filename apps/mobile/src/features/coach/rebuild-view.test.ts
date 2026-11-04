import assert from "node:assert/strict";
import { test } from "node:test";

import type { CurrentPlan, PlanDay } from "../../lib/api/types.ts";
import {
  changeSummary,
  originalRows,
  rebuildMetrics,
  rebuildRows,
  weekdayOf,
  windowDays,
} from "./rebuild-view.ts";

const lift = (date: string, title: string, sets = 3): PlanDay => ({
  id: `d-${date}`,
  dayIndex: 0,
  date,
  kind: "lift",
  workout: {
    id: `w-${date}`,
    title,
    durationMin: 45,
    exercises: [{ id: "e", name: "Squat", targetSets: sets, targetReps: "8" }],
  },
});
const rest = (date: string): PlanDay => ({ id: `d-${date}`, dayIndex: 0, date, kind: "rest", label: "rest" });
const plan = (days: PlanDay[], kcal = 2900, version = 1): CurrentPlan => ({
  id: `p${version}`,
  version,
  status: "ready",
  weekStart: "2026-11-02",
  summary: { kcalTarget: kcal },
  days,
});

// Week of Mon 2026-11-02; QA ran on Wed 11-04. Mon/Wed/Fri lifts shift to Tue/Thu/Sat.
const before = plan([
  lift("2026-11-02", "Upper"),
  rest("2026-11-03"),
  lift("2026-11-04", "Lower"),
  rest("2026-11-05"),
  lift("2026-11-06", "Full"),
  rest("2026-11-07"),
  rest("2026-11-08"),
]);
const after = plan(
  [
    rest("2026-11-02"),
    lift("2026-11-03", "Upper"),
    rest("2026-11-04"),
    lift("2026-11-05", "Lower"),
    rest("2026-11-06"),
    lift("2026-11-07", "Full", 4),
    rest("2026-11-08"),
  ],
  2750,
  2,
);
const TODAY = "2026-11-04";

test("weekdayOf reads the calendar date, not the device timezone", () => {
  assert.equal(weekdayOf("2026-11-04"), "WED");
  assert.equal(weekdayOf("2026-11-08"), "SUN");
  assert.equal(weekdayOf("bad"), "");
});

test("TODAY tag sits on today's date, not the first plan day (QA: 11-02 tagged TODAY on 11-04)", () => {
  const rows = rebuildRows(after, before, TODAY);
  assert.equal(rows[0]?.date, "2026-11-04");
  assert.equal(rows[0]?.tag, "Today");
  assert.equal(rows.filter((r) => r.tag === "Today").length, 1);
  assert.deepEqual(
    rows.map((r) => r.tag),
    ["Today", "Day 2", "Rest", "Day 4"],
  );
});

test("rows compare against the current plan for the same date", () => {
  const rows = rebuildRows(after, before, TODAY);
  assert.equal(rows[1]?.changed, true);
  assert.equal(rows[1]?.note, "Was Rest day");
  assert.equal(rows[0]?.note, "Was Lower");
});

test("whole plan in the past: falls back to the first days, no TODAY tag", () => {
  const rows = rebuildRows(after, before, "2026-12-01");
  assert.equal(rows[0]?.date, "2026-11-02");
  assert.equal(rows.some((r) => r.isToday), false);
  assert.equal(windowDays(null, TODAY).length, 0);
});

test("original rows use the same dates and mark moved slots", () => {
  const rows = originalRows(before, after, TODAY);
  assert.deepEqual(
    rows.map((r) => [r.weekday, r.title, r.changed]),
    [
      ["WED", "Lower", true],
      ["THU", "Rest day", true],
      ["FRI", "Full", true],
      ["SAT", "Rest day", true],
    ],
  );
});

test("metrics: volume match, kcal delta, shortest recovery gap", () => {
  const m = rebuildMetrics(after, before, TODAY);
  assert.equal(m.sets, 10);
  assert.equal(m.volumeMatchPct, 111);
  assert.equal(m.kcalDelta, -150);
  assert.equal(m.recoveryHours, 48);
});

test("change summary names what moved", () => {
  const rows = rebuildRows(after, before, TODAY);
  assert.equal(changeSummary(rows), "Today becomes a rest day and Lower lands on Thu. Plus 2 more changes.");
  assert.equal(changeSummary(rebuildRows(before, before, TODAY)), "Your remaining days already fit. Nothing needs to move.");
});
