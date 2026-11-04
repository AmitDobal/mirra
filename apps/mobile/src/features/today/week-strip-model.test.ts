import assert from "node:assert/strict";
import { test } from "node:test";

import { buildStrip, markerFor, mondayOf } from "./week-strip-model";

const WEEK = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"];

test("plan week: letters match dates, selection follows dayIndex, today flagged", () => {
  const s = buildStrip(WEEK, 2, "2026-11-04");
  assert.deepEqual(s.map((d) => `${d.letter}${d.dayNum}`), ["M2", "T3", "W4", "T5", "F6", "S7", "S8"]);
  assert.equal(s.find((d) => d.selected)?.date, "2026-11-04");
  assert.equal(s.filter((d) => d.isToday).length, 1);
  const past = buildStrip(WEEK, 0, "2026-11-04");
  assert.equal(past[0]?.selected, true);
  assert.equal(past[0]?.isToday, false);
  assert.equal(past[2]?.isToday, true);
});

test("no plan: real Monday-first week, today under its own weekday letter (QA off-by-one)", () => {
  // Wednesday 2026-11-04: old fallback put today in slot 3 (Thursday letter).
  const s = buildStrip([], 0, "2026-11-04");
  assert.deepEqual(s.map((d) => d.date), WEEK);
  const today = s.find((d) => d.selected);
  assert.equal(today?.date, "2026-11-04");
  assert.equal(today?.letter, "W");
  assert.equal(today?.isToday, true);
  // Sunday + month rollover.
  const sun = buildStrip([], 0, "2026-11-01");
  assert.equal(sun[0]?.date, "2026-10-26");
  assert.equal(sun[6]?.date, "2026-11-01");
  assert.equal(sun[6]?.letter, "S");
  assert.equal(sun[6]?.selected, true);
  assert.deepEqual(sun.map((d) => d.dayNum), [26, 27, 28, 29, 30, 31, 1]);
});

test("mondayOf handles Sunday and year edge", () => {
  assert.equal(mondayOf("2026-11-08"), "2026-11-02");
  assert.equal(mondayOf("2027-01-01"), "2026-12-28");
});

test("markers: workout = flame, check-in/meal/open only = muted dot, future = none", () => {
  const presence = { "2026-11-02": "active", "2026-11-03": "active", "2026-11-04": "open", "2026-11-06": "active" } as const;
  const workouts = { "2026-11-02": true, "2026-11-06": true };
  const today = "2026-11-04";
  assert.equal(markerFor("2026-11-02", today, presence, workouts), "flame");
  assert.equal(markerFor("2026-11-03", today, presence, workouts), "dot", "rest-day check-in only");
  assert.equal(markerFor("2026-11-04", today, presence, workouts), "dot");
  assert.equal(markerFor("2026-11-05", today, presence, workouts), "none");
  assert.equal(markerFor("2026-11-06", today, presence, workouts), "none", "future never marked");
  assert.equal(markerFor("2026-11-01", today, {}, {}), "none");
});
