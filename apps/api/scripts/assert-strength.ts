/**
 * Offline assertions for the strength engine (AMI-165). Pure: no D1.
 *   npm run test:strength -w @mirra/api
 */
import { STANDARDS } from "../src/data/strength-standards";
import { libraryResponse } from "../src/lib/exercise-library";
import {
  anchorsAt,
  anchorsFromRows,
  bestSet,
  contributorTargetPct,
  diffSteps,
  e1rm,
  effectiveLoad,
  exercisePctOf,
  label,
  liftAnchors,
  muscleScores,
  nextExerciseScore,
  nextTarget,
  overallScore,
  pctOf,
  rankedLift,
  repsFromPlan,
  rollup,
  roundLoad,
  scoreSession,
  stepLowerPct,
  stepOfPct,
  tierOfStep,
  valueAtPct,
  workingSets,
  type ExerciseScoreRow,
  type ExerciseScoreState,
  type StrengthSnapshot,
} from "../src/lib/strength";

let failures = 0;
let passes = 0;
const check = (ok: boolean, label_: string, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label_}${detail ? `  (${detail})` : ""}`);
  if (ok) passes += 1;
  else failures += 1;
};
const near = (a: number, b: number, eps = 0.05) => Math.abs(a - b) <= eps;

// ── Tiers ──────────────────────────────────────────────────────────────────
check(stepOfPct(0) === 0 && label(0) === "Iron III", "step 0 = Iron III");
check(stepOfPct(2.99) === 0 && stepOfPct(3) === 1, "Iron III → Iron II at 3");
check(stepOfPct(40) === 9 && label(9) === "Gold III", "step 9 = Gold III at 40");
check(stepOfPct(39.99) === 8 && label(8) === "Silver I", "39.99 = Silver I");
check(stepOfPct(93) === 20 && label(20) === "Elite I", "step 20 = Elite I at 93");
check(stepOfPct(97) === 21 && label(21) === "Legendary" && tierOfStep(21).division === null, "step 21 = Legendary, no division");
check(stepOfPct(99.9) === 21 && stepLowerPct(21) === 97, "99.9 stays Legendary");
check(tierOfStep(3).tier === "bronze" && tierOfStep(3).division === 3 && tierOfStep(5).division === 1, "Bronze III → I");

// ── Epley + bodyweight ───────────────────────────────────────────────────────
check(near(e1rm(100, 5), 116.667, 0.01), "Epley 100 × 5 = 116.7");
check(near(e1rm(80, 8), 101.333, 0.01), "Epley 80 × 8 = 101.3");
const pullUp = rankedLift("pull_up")!;
const pushUp = rankedLift("push_up")!;
check(effectiveLoad({ weightKg: null, reps: 8 }, pullUp.entry, 80) === 80, "pull-up bw only = 80 kg");
check(effectiveLoad({ weightKg: 10, reps: 5 }, pullUp.entry, 80) === 90, "pull-up +10 kg = 90 kg");
check(near(effectiveLoad({ weightKg: 0, reps: 20 }, pushUp.entry, 80)!, 52), "push-up = 0.65 × bw");
check(effectiveLoad({ weightKg: null, reps: 8 }, pullUp.entry, null) === null, "bodyweight lift without bw is unscored");
check(rankedLift("assisted_pull_up") === null, "assisted pull-up has no tier (reps-only, no standard)");
check(rankedLift("smith_bench_press") === null && rankedLift("tag:sled push") === null, "library lift w/o standard + tag lift: unranked");

// ── Working sets ─────────────────────────────────────────────────────────────
const bench = rankedLift("bench_press")!;
const ws = workingSets(
  [{ weightKg: 20, reps: 10 }, { weightKg: 80, reps: 8 }, { weightKg: 60, reps: 20 }, { weightKg: 70, reps: 0 }, { weightKg: 50, reps: 10 }],
  bench.entry,
);
check(ws.length === 2 && ws.every((s) => (s.weightKg ?? 0) >= 40), "warm-up (<50% top), >15 reps and 0 reps dropped", JSON.stringify(ws));
check(bestSet([], bench.entry, 80) === null, "no sets → no best set");

// ── Percentile ───────────────────────────────────────────────────────────────
const male80 = anchorsAt("bench_press", "male", 80);
check(near(male80[2], 80, 8) && near(male80[3], 100, 10), "male 80 kg bench T50 ≈ 1.0 bw, T80 ≈ 1.25 bw (calibration ±10%)", male80.join("/"));
const sq80 = anchorsAt("back_squat", "male", 80);
const dl80 = anchorsAt("deadlift", "male", 80);
check(near(sq80[2], 112, 11.2) && near(dl80[2], 136, 13.6), "male 80 kg squat/deadlift T50 within ±10% of 1.4/1.7 bw", `${sq80[2]}/${dl80[2]}`);
const m85 = anchorsAt("bench_press", "male", 85);
const r80 = STANDARDS.male.bench_press.find((r) => r[0] === 80)!;
const r90 = STANDARDS.male.bench_press.find((r) => r[0] === 90)!;
check(near(m85[2], (r80[3] + r90[3]) / 2, 0.01), "bodyweight interpolation is linear between rows");
const f80 = anchorsAt("bench_press", "female", 80);
const u80 = anchorsAt("bench_press", null, 80);
check(near(u80[2], (male80[2] + f80[2]) / 2, 0.01) && f80[2] < male80[2], "unknown sex = mean of cohorts; female < male");
check(anchorsFromRows(STANDARDS.male.bench_press, 160)[2] > STANDARDS.male.bench_press.at(-1)![3], "above last row: allometric growth");
check(pctOf(male80[2], male80) === 50 && pctOf(male80[0], male80) === 5, "pct at T50 = 50, at T5 = 5");
check(near(pctOf(male80[0] / 2, male80), 2.5), "below T5: 5 × v / T5");
check(near(pctOf(male80[4] * 1.1, male80), 97) && pctOf(male80[4] * 3, male80) === 99.9, "above T95: +5 per 25% of T95, capped 99.9");
check(pctOf(0, male80) === 0, "zero value = 0 pct");
const trip = [1, 5, 12, 35, 50, 64, 80, 90, 95, 98].every((p) => near(pctOf(valueAtPct(p, male80), male80), p, 1e-6));
check(trip, "valueAtPct ∘ pctOf round trip (1..98)");

// ── EWMA + floor + hysteresis ────────────────────────────────────────────────
let s: ExerciseScoreState = nextExerciseScore(null, 60);
check(s.sustainedPct === 60 && s.displayStep === stepOfPct(60) && s.sessions === 1, "first session seeds EWMA");
s = nextExerciseScore(s, 70);
check(near(s.sustainedPct, 63) && s.bestPct === 70, "EWMA 0.3 × 70 + 0.7 × 60 = 63");
check(near(exercisePctOf(s), 63) && s.displayStep === stepOfPct(63), "promote immediately");
s = nextExerciseScore(s, 20);
check(near(exercisePctOf(s), 0.85 * 70) && s.belowCount === 0, "floor holds at 85% of best (59.5)");
let h = nextExerciseScore(null, 81); // Diamond I (step 17)
h = nextExerciseScore(h, 30);
check(h.displayStep === 17 && h.belowCount === 1, "1 bad session: no demotion");
h = nextExerciseScore(h, 30);
check(h.displayStep === 16 && h.belowCount === 0, "2 straight bad sessions: demote one step");
for (let i = 0; i < 20; i += 1) h = nextExerciseScore(h, 10);
check(h.displayStep >= stepOfPct(0.85 * 81) && h.displayStep <= 16 && exercisePctOf(h) >= 0.85 * 81 - 1e-9, "endless deload never goes below the 85% floor step", `step ${h.displayStep}`);
// 30 days off = zero sessions = no update. Then one weak session.
const rested = nextExerciseScore(nextExerciseScore(nextExerciseScore(null, 52), 55), 56);
const back = nextExerciseScore(rested, 25);
check(back.displayStep === rested.displayStep, "30 days rest + one weak session never drops a step", `${label(rested.displayStep)} → ${label(back.displayStep)}`);

// ── Session scoring ──────────────────────────────────────────────────────────
check(scoreSession({ sets: [], prev: new Map(), sex: "male", bw: 80 }).size === 0, "no sets → no score rows");
const first = scoreSession({
  sets: [
    { canonicalId: "bench_press", weightKg: 80, reps: 8 },
    { canonicalId: "pull_up", weightKg: null, reps: 10 },
    { canonicalId: "tag:sled push", weightKg: 100, reps: 10 },
    { canonicalId: "cable_fly", weightKg: 20, reps: 12 },
  ],
  prev: new Map(),
  sex: "male",
  bw: 80,
});
check(first.size === 2 && first.has("bench_press") && first.has("pull_up"), "only lifts with a standard get scores");

// ── Muscle weighting + overall ───────────────────────────────────────────────
const ms = muscleScores([
  { exerciseId: "a", muscles: [{ id: "chest", pct: 60 }, { id: "triceps", pct: 24 }], sets90d: 10, pct: 60 },
  { exerciseId: "b", muscles: [{ id: "chest", pct: 30 }, { id: "triceps", pct: 70 }], sets90d: 5, pct: 30 },
  { exerciseId: "c", muscles: [{ id: "chest", pct: 90 }], sets90d: 20, pct: null },
]);
check(near(ms.get("chest")!.pct, (600 * 60 + 150 * 30) / 750), "muscle pct = Σ(inv × sets × pct) / Σw");
check(ms.get("triceps")!.contributors.length === 1 && ms.get("triceps")!.pct === 30, "involvement < 25% ignored; unranked lift ignored");
check(!ms.has("abs"), "untouched muscle stays unranked");
const stale = muscleScores([{ exerciseId: "a", muscles: [{ id: "lats", pct: 55 }], sets90d: 0, pct: 40 }]);
check(stale.get("lats")?.pct === 40, "rest > 90 days: muscle keeps its rank (involvement fallback)");
const g5 = new Map([["chest", 60], ["back", 50], ["legs", 40], ["arms", 50], ["shoulders", 50]] as const);
check(overallScore(g5, 7).pct === null && overallScore(g5, 7).unlock.ranked === 7, "overall locked under 8 ranked lifts");
check(overallScore(new Map([...g5].slice(0, 4)), 9).pct === null, "overall locked under 5 groups");
check(near(overallScore(g5, 8).pct!, 0.75 * 50 + 0.25 * 40), "overall = 0.75 × mean + 0.25 × min");

// ── Rollup + tier changes ────────────────────────────────────────────────────
const empty: StrengthSnapshot = { muscles: new Map(), groups: new Map(), overall: null };
const r1 = rollup(first, new Map([["bench_press", 4], ["pull_up", 3]]), empty);
const d1 = diffSteps(new Map(), first, empty, r1);
check(r1.muscles.has("chest") && r1.muscles.has("lats") && !r1.muscles.has("abs"), "rollup ranks chest + lats, core unranked");
check(d1.changes.length <= 6 && d1.changes[0]!.scope === "group" && d1.changes.at(-1)!.scope !== "overall", "changes capped at 6, group before muscle/exercise");
check(d1.events.length > d1.changes.length && d1.events.every((e) => e.fromStep === null), "first rank emits events for every scope");
const prevRow = first.get("bench_press")!;
const heavier = scoreSession({ sets: [{ canonicalId: "bench_press", weightKg: 100, reps: 6 }], prev: first, sex: "male", bw: 80 });
const merged = new Map<string, ExerciseScoreRow>([...first, ...heavier]);
const snap1: StrengthSnapshot = { muscles: r1.muscles, groups: r1.groups, overall: r1.overall };
const r2 = rollup(merged, new Map([["bench_press", 8], ["pull_up", 3]]), snap1);
const d2 = diffSteps(first, heavier, snap1, r2);
check(
  heavier.get("bench_press")!.displayStep > prevRow.displayStep && d2.changes.some((c) => c.scope === "muscle" && c.refId === "chest"),
  "heavier bench promotes the exercise and chest",
  d2.changes.map((c) => `${c.scope}:${c.refId} ${c.from?.label}→${c.to.label}`).join(", "),
);

// ── Next target worked examples ──────────────────────────────────────────────
const benchPct = pctOf(e1rm(80, 8), male80);
const benchStep = stepOfPct(benchPct);
console.log(`      worked example: male 80 kg, bench 80 × 8 → e1RM ${e1rm(80, 8).toFixed(1)} kg, pct ${benchPct.toFixed(1)}, ${label(benchStep)}`);
const tgtInput = (units: "metric" | "imperial", planReps: string | null) => ({
  lift: { id: "bench_press", name: "Barbell Bench Press", scoring: "load" as const, anchors: male80 },
  sustainedPct: benchPct,
  bestPct: benchPct,
  targetPct: stepLowerPct(benchStep + 1),
  toLabel: label(benchStep + 1),
  bw: 80,
  units,
  planReps,
});
const tKg = nextTarget(tgtInput("metric", "8-12"))!;
const tLb = nextTarget(tgtInput("imperial", "8-12"))!;
console.log(`      next: ${tKg.display} for ${tKg.sessions} session(s) → ${tKg.toLabel}; imperial ${tLb.display}`);
check(tKg.reps === 8 && tKg.weightKg! % 2.5 === 0 && tKg.weightKg! > 80, "load target rounds up to 2.5 kg at plan low-end reps", tKg.display);
check(/^\d+ lb × 8$/.test(tLb.display) && Number(tLb.display.split(" ")[0]) % 5 === 0, "imperial target rounds up to 5 lb", tLb.display);
check(roundLoad(94.03, "imperial").text === "210 lb" && roundLoad(81.2, "metric").kg === 82.5, "roundLoad: 94.03 kg → 210 lb, 81.2 → 82.5 kg");
check(repsFromPlan("8-12") === 8 && repsFromPlan(null) === 8 && repsFromPlan("AMRAP") === 8 && repsFromPlan("5") === 5, "plan reps low end, default 8");
const after = nextExerciseScore(nextExerciseScore(null, benchPct), pctOf(e1rm(tKg.weightKg!, tKg.reps), male80));
check(after.displayStep >= benchStep + 1, "doing the target set reaches the promised division", label(after.displayStep));

const pu80 = liftAnchors(pullUp, "male", 80);
const puPct = pctOf(e1rm(80, 8), pu80);
const puStep = stepOfPct(puPct);
const tAdd = nextTarget({
  lift: { id: "pull_up", name: "Pull-Up", scoring: "bodyweight", bwFactor: 1, anchors: pu80 },
  sustainedPct: puPct, bestPct: puPct, targetPct: stepLowerPct(puStep + 1), toLabel: label(puStep + 1), bw: 80, units: "metric", planReps: "8-10",
})!;
check(tAdd.weightKg != null && tAdd.weightKg > 0 && tAdd.display.startsWith("+"), "bodyweight target adds load (pull-up bw × 8)", tAdd.display);
const lowPct = pctOf(e1rm(80, 3), pu80);
const tReps = nextTarget({
  lift: { id: "pull_up", name: "Pull-Up", scoring: "bodyweight", bwFactor: 1, anchors: pu80 },
  sustainedPct: lowPct, bestPct: lowPct, targetPct: stepLowerPct(stepOfPct(lowPct) + 1), toLabel: label(stepOfPct(lowPct) + 1), bw: 80, units: "metric", planReps: "8",
})!;
check(tReps.weightKg === null && /^BW × \d+$/.test(tReps.display) && tReps.reps > 3 && tReps.reps <= 8, "bodyweight reps-only target (pull-up × 3)", tReps.display);
const plank = rankedLift("plank")!;
const plA = liftAnchors(plank, "female", 60);
const tPlank = nextTarget({
  lift: { id: "plank", name: "Forearm Plank", scoring: "time", anchors: plA },
  sustainedPct: pctOf(60, plA), bestPct: pctOf(60, plA), targetPct: stepLowerPct(stepOfPct(pctOf(60, plA)) + 1), toLabel: "x", bw: 60, units: "metric", planReps: null,
})!;
check(tPlank.display.endsWith(" s hold") && tPlank.reps > 60, "time target in seconds (plank 60 s)", tPlank.display);
check(nextTarget({ ...tgtInput("metric", null), targetPct: 99.5 }) === null, "unreachable within 3 sessions → null");
check(near(contributorTargetPct(50, 50, 55, 100, 50), 60) && contributorTargetPct(50, 50, 90, 100, 10) === 99, "muscle target → contributor pct, capped 99");

// ── Dumbbell per-hand convention (AMI-183) ──────────────────────────────────
// QA: one "20 kg × 8" DB bench made a ~60 kg female Chest Elite I. The HUD only said "KG", so
// 20 was the pair (2 × 10 kg). Logged load is now one dumbbell ("KG PER HAND"); the standard
// is per hand (bench × 0.37 ⇒ pair ≈ 74% of the barbell bench).
const dbBench = rankedLift("dumbbell_bench_press")!;
check(libraryResponse(dbBench.entry).loadPerHand === true, "DB bench logs per hand");
check(libraryResponse(bench.entry).loadPerHand === false, "barbell bench is not per hand");
check(libraryResponse(rankedLift("goblet_squat")!.entry).loadPerHand === false, "goblet squat (one dumbbell) is not per hand");
const dbScore = (perHandKg: number) =>
  scoreSession({ sets: [{ canonicalId: "dumbbell_bench_press", weightKg: perHandKg, reps: 8 }], prev: new Map(), sex: "female", bw: 60 })
    .get("dumbbell_bench_press")!;
const pair20 = dbScore(10);
check(pair20.displayStep >= stepOfPct(25) && pair20.displayStep <= stepOfPct(54.99), "20 kg pair × 8 (10 kg per hand), female 60 kg → Silver/Gold, not Elite", label(pair20.displayStep));
// Barbell-equivalent check: per hand × 2 ÷ (2 × 0.37) gives the same pct as a barbell bench of that load.
const barbellEq = scoreSession({ sets: [{ canonicalId: "bench_press", weightKg: (10 * 2) / (2 * 0.37), reps: 8 }], prev: new Map(), sex: "female", bw: 60 }).get("bench_press")!;
check(near(exercisePctOf(pair20), exercisePctOf(barbellEq), 0.01), "DB pair scores like its barbell equivalent (pair ÷ 0.74)", `${exercisePctOf(pair20).toFixed(1)} vs ${exercisePctOf(barbellEq).toFixed(1)}`);
const perHand20 = dbScore(20);
check(perHand20.displayStep > pair20.displayStep + 6, "20 kg PER HAND × 8 (≈68 kg barbell, 1.1 × bw) ranks far above the pair reading", label(perHand20.displayStep));

console.log(`\n${passes} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
console.log("PASS strength");
