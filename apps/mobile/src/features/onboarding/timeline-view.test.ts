import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { previewGoal } from "@mirra/contracts";

import { AFTER_WEEK_REVEAL, ONBOARDING_SCREENS } from "./funnel-steps";
import { buildTargetPaceView, toGoalPreviewAnswers, weekRevealPaceLine, type GoalSource } from "./goal-preview";
import { buildTimelineView, type TimelineContext } from "./timeline-view";

const TODAY = "2026-11-04";
const src: GoalSource = {
  goal: "lose_fat",
  experience: "some_months",
  sex: "male",
  age: 29,
  heightCm: 180,
  weightKg: 82,
  goalWeightKg: 75,
  pace: "steady",
  trainingDays: [true, true, false, true, true, false, false],
  weightUnit: "kg",
};
const ctx: TimelineContext = {
  unit: "kg",
  goalLabel: "Lose fat",
  paceLabel: "Steady",
  experienceLabel: "Some months",
  sessions: 4,
  sessionMinutes: 45,
  kcal: 2250,
  proteinG: 150,
};
const view = (s: GoalSource, c: Partial<TimelineContext> = {}) =>
  buildTimelineView(previewGoal(toGoalPreviewAnswers(s), TODAY), { ...ctx, unit: s.weightUnit, ...c });

test("S06: per-pace rates and ~18 weeks for 82 → 75 kg steady", () => {
  const v = buildTargetPaceView(src, 75, TODAY);
  assert.deepEqual(v.rates, { steady: "~0.5 kg / week", aggressive: "~0.8 kg / week" });
  assert.equal(v.weeks, 18);
  assert.equal(v.current, "82 kg");
  assert.equal(v.overall, "−7 kg");
});

test("S06: week count follows the selected pace live", () => {
  assert.equal(buildTargetPaceView({ ...src, pace: "aggressive" }, 75, TODAY).weeks, 11);
});

test("S06: lb user sees lb; the engine still gets kg", () => {
  const lb = { ...src, weightUnit: "lb" as const };
  assert.equal(toGoalPreviewAnswers(lb).profile.weightKg, 82);
  const v = buildTargetPaceView(lb, 75, TODAY);
  assert.deepEqual(v.rates, { steady: "~1.1 lb / week", aggressive: "~1.8 lb / week" });
  assert.equal(v.current, "181 lb");
  assert.equal(v.overall, "−16 lb");
});

test("S06: goal = current weight → hold, no rates or weeks", () => {
  const v = buildTargetPaceView(src, 82, TODAY);
  assert.deepEqual(v.rates, { steady: null, aggressive: null });
  assert.equal(v.weeks, null);
  assert.equal(v.overall, null);
});

test("S06: minors flagged (aggressive treated as steady)", () => {
  assert.equal(buildTargetPaceView({ ...src, age: 16 }, 75, TODAY).minor, true);
});

test("S12: engine line '~7 kg by around Mar 6'; none without a goal weight", () => {
  const p = previewGoal(toGoalPreviewAnswers(src), TODAY);
  assert.deepEqual(weekRevealPaceLine(p, "kg"), { amount: "7 kg", date: "Mar 6" });
  const skip = previewGoal(toGoalPreviewAnswers({ ...src, goalWeightKg: null }), TODAY);
  assert.equal(weekRevealPaceLine(skip, "kg"), null);
  const lb = previewGoal(toGoalPreviewAnswers({ ...src, weightUnit: "lb" }), TODAY);
  assert.deepEqual(weekRevealPaceLine(lb, "lb"), { amount: "16 lb", date: "Mar 6" });
});

test("S43 fixture matches Stitch: headline, stats, milestones, summary", () => {
  const v = view(src);
  assert.equal(v.kind, "eta");
  assert.equal(v.headline, "82 → 75 kg,\naround Mar 6");
  assert.equal(v.paceLine, "Steady · ~0.5 kg / week");
  assert.deepEqual(v.stats.map((s) => s.value), ["Mar 6", "Feb 16 – Apr 26", "~18"]);
  assert.deepEqual(
    v.milestones.map((m) => [m.title, m.detail, m.date, m.final]),
    [
      ["First visible change", "Often around here · −2.5 kg", "Dec 16", false],
      ["Halfway", "78.5 kg", "Jan 3", false],
      ["Goal", "75 kg", "Mar 6", true],
    ],
  );
  assert.deepEqual(v.picked.map((r) => r.value), [
    "Lose fat", "82 → 75 kg", "Steady · ~0.5 kg / week", "4 days · 45 min", "Some months", "2,250 kcal · 150 g protein",
  ]);
  assert.equal(v.whatIf, "Hit 4 of 4 sessions every week: around Feb 16.");
  assert.equal(v.commitLine, "I commit to my 4 sessions this week.");
  assert.equal(v.chart!.etaWeeks, 17.5);
});

test("S43 lb: every weight in lb", () => {
  const v = view({ ...src, weightUnit: "lb" });
  assert.equal(v.headline, "181 → 165 lb,\naround Mar 6");
  assert.equal(v.picked[1]!.value, "181 → 165 lb");
  assert.equal(v.milestones[1]!.detail, "173 lb");
  assert.equal(v.chart!.data.unit, "lb");
  assert.ok(!JSON.stringify(v).includes(" kg"));
});

test("S43 skipped goal weight: 12-week horizon, no date", () => {
  const v = view({ ...src, goalWeightKg: null });
  assert.equal(v.kind, "horizon");
  assert.equal(v.headline, "82 kg today,\nyour next 12 weeks");
  assert.equal(v.chart!.data.planned.length, 13);
  assert.equal(v.chart!.data.targetKg, null);
  assert.equal(v.chart!.etaWeeks, null);
  assert.equal(v.whatIf, null);
  assert.equal(v.picked[1]!.value, "82 kg · No goal weight");
  assert.ok(!/around/.test(v.headline));
});

test("S43 build muscle: gain timeline with strength milestone", () => {
  const v = view({ ...src, goal: "build_muscle", goalWeightKg: 86 }, { goalLabel: "Build muscle" });
  assert.equal(v.kind, "eta");
  assert.equal(v.headline, "82 → 86 kg,\naround Mar 15");
  assert.equal(v.milestones[0]!.title, "Strength usually climbs first");
  assert.equal(v.milestones[0]!.date, null);
  assert.equal(v.milestones.at(-1)!.final, true);
});

test("S43 recomp / consistency hold: band, no ETA, no whatIf", () => {
  const v = view({ ...src, goal: "recomp", goalWeightKg: 82 }, { goalLabel: "Recomp" });
  assert.equal(v.kind, "hold");
  assert.equal(v.headline, "Recomp,\nholding 82 kg");
  assert.equal(v.paceLine, "Hold");
  assert.equal(v.stats[2]!.value, "Dec 2");
  assert.equal(v.whatIf, null);
  const g = view({ ...src, goal: "consistent", goalWeightKg: null }, { goalLabel: "Get consistent" });
  assert.equal(g.kind, "hold");
  assert.deepEqual(g.milestones.map((m) => m.title), ["14-day habit", "30-day habit", "66-day habit"]);
});

test("S43 flags: minor pace and direction mismatch explained in the sub line", () => {
  assert.match(view({ ...src, age: 16, pace: "aggressive" }).sub, /Under 18/);
  assert.match(view({ ...src, goal: "build_muscle" }).sub, /shows a cut/);
});

test("S43 kcal falls back to the engine hint (rounded) without a plan summary", () => {
  assert.equal(view(src, { kcal: null, proteinG: null }).picked.at(-1)!.value, "2,250 kcal");
});

test("funnel: timeline sits after week-reveal, before paywall/auth; layout matches", () => {
  const i = ONBOARDING_SCREENS.indexOf("timeline");
  assert.equal(ONBOARDING_SCREENS[i - 1], "week-reveal");
  assert.ok(i < ONBOARDING_SCREENS.indexOf("paywall") && i < ONBOARDING_SCREENS.indexOf("auth"));
  assert.equal(AFTER_WEEK_REVEAL, "/(onboarding)/timeline");
  const here = dirname(fileURLToPath(import.meta.url));
  const layout = readFileSync(join(here, "../../../app/(onboarding)/_layout.tsx"), "utf8");
  const order = [...layout.matchAll(/Stack\.Screen name="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(order, [...ONBOARDING_SCREENS]);
});
