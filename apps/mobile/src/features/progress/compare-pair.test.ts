import assert from "node:assert/strict";
import { test } from "node:test";

import { pickComparePair, type ComparePhoto } from "./compare-pair.ts";
import { computeWeightStats, formatDelta } from "./weight-journey.ts";

const DAY = 86_400_000;
const photo = (id: string, daysAgo: number): ComparePhoto => ({
  id,
  label: id,
  uri: `file:///${id}.jpg`,
  takenAt: Date.UTC(2026, 10, 30) - daysAgo * DAY,
});

test("AMI-177: onboarding selfie is the baseline when present", () => {
  const mirror: ComparePhoto = { id: "mirror", label: "Baseline", uri: "file:///m.jpg", takenAt: null };
  const pair = pickComparePair([photo("new", 0)], mirror);
  assert.equal(pair.current?.id, "new");
  assert.equal(pair.baseline?.id, "mirror");
  assert.equal(pair.daysApart, null);
});

test("AMI-177: without a selfie the oldest photo is the baseline", () => {
  const pair = pickComparePair([photo("new", 0), photo("mid", 7), photo("old", 21)], null);
  assert.equal(pair.baseline?.id, "old");
  assert.equal(pair.daysApart, 21);
  // A selfie with no image never replaces a real photo.
  const noUri = pickComparePair([photo("new", 0), photo("old", 3)], {
    id: "m", label: "m", uri: null, takenAt: null,
  });
  assert.equal(noUri.baseline?.id, "old");
});

test("one photo and no selfie → no baseline", () => {
  assert.equal(pickComparePair([photo("only", 0)], null).baseline, null);
  assert.equal(pickComparePair([], null).current, null);
});

test("AMI-177: 'to goal' is the change still needed (goal − latest)", () => {
  const entries = [{ kg: 75.5 }, { kg: 77 }] as never;
  const stats = computeWeightStats(entries, 72);
  assert.equal(stats.deltaToGoalKg, -3.5);
  assert.equal(formatDelta(stats.deltaToGoalKg ?? 0), "−3.5 kg");
  assert.equal(computeWeightStats([{ kg: 70 }] as never, 72).deltaToGoalKg, 2);
});
