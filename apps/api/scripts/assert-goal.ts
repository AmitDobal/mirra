/**
 * Offline assertions for the goal engine (AMI-178). Pure: no D1, no clock.
 *   npm run test:goal -w @mirra/api
 * Fixture `goal-82-75-steady` = arch `docs/03-engineering/goal-timeline.md` §3 worked example.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  GoalResponseSchema,
  OnboardingBodySchema,
  goalEngine as G,
  previewGoal,
  projectGoal,
  type GoalInput,
  type GoalProjection,
} from "@mirra/contracts";

import { runEdgeAsserts } from "./assert-goal-edges";
import { runSchemaAsserts } from "./assert-goal-schemas";

let failures = 0;
let passes = 0;
export type Check = (ok: boolean, label: string, detail?: string) => void;
const check: Check = (ok, label, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  if (ok) passes += 1;
  else failures += 1;
};
const near = (a: number | null | undefined, b: number, eps = 0.01) => a != null && Math.abs(a - b) <= eps;
const within = (d: string | null | undefined, want: string, days: number) => d != null && Math.abs(G.diffDays(d, want)) <= days;

// ── Fixture goal-82-75-steady ────────────────────────────────────────────────
const START = "2026-11-04";
export const FIXTURE_ANSWERS = {
  profile: { sex: "male", ageYears: 29, heightCm: 180, weightKg: 82, goalWeightKg: 75, pace: "steady" },
  preferences: { primaryGoal: "lose_fat", experience: "months", trainDays: [1, 2, 4, 5], units: "metric" },
} as const;
/** Daily weigh-ins Nov 4 → Dec 9 (36 days): 81.5 − 0.074·d ± 0.2 kg day noise → trend 79.6, slope 0.48 kg/wk. */
const FIXTURE_KG = [
  81.7, 81.3, 81.2, 81.4, 81.2, 81.3, 80.9, 81.2, 80.8, 80.6, 80.9, 80.7, 80.8, 80.4, 80.7, 80.3, 80.1, 80.3,
  80.2, 80.2, 79.9, 80.1, 79.8, 79.6, 79.8, 79.6, 79.7, 79.4, 79.6, 79.3, 79.1, 79.3, 79.1, 79.2, 78.8, 79.1,
];
const fixtureLogs = FIXTURE_KG.map((kg, d) => ({ date: G.addDays(START, d), kg }));
/** Last 28 days: 12/16 lift days, fuel 10/20 on target, 21/28 check-ins → A = 0.625. */
const window28 = (n: number) => Array.from({ length: n }, (_, i) => G.addDays("2026-11-12", i));
const fixtureSessions = window28(28)
  .filter((_, i) => i % 7 < 4)
  .map((date, i) => ({ date, done: i % 4 !== 3 }));
const fixtureFuel = window28(20).map((date, i) => ({ date, onTarget: i % 2 === 0 }));
const fixtureCheckIns = window28(28).filter((_, i) => i % 4 !== 3);

export const fixtureDay35 = (): GoalInput => ({
  profile: {
    goalType: "fat_loss", pace: "steady", experience: "months", sex: "male", ageYears: 29, heightCm: 180,
    startWeightKg: 82, targetWeightKg: 75, trainDaysPerWeek: 4, units: "metric",
  },
  startDate: START,
  today: "2026-12-09",
  logs: fixtureLogs,
  sessions: fixtureSessions,
  fuelDays: fixtureFuel,
  checkInDates: fixtureCheckIns,
});

const d0: GoalProjection = previewGoal(FIXTURE_ANSWERS, START);
check(near(d0.rates.optimistic, 0.49) && near(d0.rates.expected, 0.42) && near(d0.rates.conservative, 0.30),
  "day 0 rates 0.49 / 0.42 / 0.30 kg/wk", `${d0.rates.optimistic} / ${d0.rates.expected} / ${d0.rates.conservative}`);
check(near(d0.paceRateKg, 0.49) && d0.pace === "steady", "S06 steady chip ~0.5 kg/wk", String(d0.paceRateKg));
check(d0.band.expected === "2027-03-06", "day 0 expected around Mar 6, 2027", String(d0.band.expected));
check(d0.band.optimistic === "2027-02-16" && d0.band.conservative === "2027-04-26", "day 0 range Feb 16 – Apr 26",
  `${d0.band.optimistic} – ${d0.band.conservative}`);
check(near(d0.band.weeksExpected, 17.5, 0.05), "expected ~17.5 weeks", String(d0.band.weeksExpected));
check(d0.whatIf?.eta === "2027-02-16", "whatIf (A = 1) ≈ Feb 16", JSON.stringify(d0.whatIf));
check(d0.kcalHint === 2257, "kcal hint 2,257 (BMR 1,805, TDEE 2,798)", String(d0.kcalHint));
check(G.bmr("male", 29, 180, 82) === 1805 && Math.round(G.bmr("male", 29, 180, 82) * G.activityFactor(4)) === 2798, "BMR 1805, TDEE 2798");
check(d0.status === "calibrating" && d0.mode === "eta" && d0.direction === "down" && d0.flags.length === 0, "day 0 calibrating, eta, down, no flags");
const ms0 = Object.fromEntries(d0.milestones.map((m) => [m.id, m]));
check(ms0.first_change?.date === "2026-12-16" && ms0.first_change?.detail === "−2.5 kg", "first change ~Dec 16 (−2.5 kg)", JSON.stringify(ms0.first_change));
check(ms0.halfway?.date === "2027-01-03" && ms0.halfway?.label === "Halfway · 78.5 kg", "halfway 78.5 kg ~Jan 3", JSON.stringify(ms0.halfway));
check(ms0.pct5?.date === "2027-01-13" && ms0.pct5?.label.includes("77.9 kg") === true, "5 % (77.9 kg) ~Jan 13", JSON.stringify(ms0.pct5));
check(ms0.goal?.date === "2027-03-06" && JSON.stringify(ms0.goal?.window) === '["2027-02-16","2027-04-26"]', "goal milestone = band", JSON.stringify(ms0.goal));
check(d0.milestones.map((m) => m.id).join(",") === "first_change,halfway,pct5,goal", "fat-loss milestone order");
check(d0.chart !== null && d0.chart.planned[0] === 82 && d0.chart.planned.length <= 105 && d0.chart.todayIndex === 0, "chart weekly from start, ≤105 pts");
check(near(d0.plannedLine[5] ?? null, 79.93, 0.01), "planned line at week 5 = 79.9", String(d0.plannedLine[5]));

const d35 = projectGoal(fixtureDay35());
check(near(d35.trendKg, 79.6, 0.05), "day 35 trend 79.6 kg", String(d35.trendKg));
check(near(d35.observedKgWk, -0.48, 0.02), "observed ≈ 0.48 kg/wk down", String(d35.observedKgWk));
check(near(d35.adherence.score, 0.625, 1e-9) && !d35.adherence.prior, "fixture adherence A = 0.625", String(d35.adherence.score));
check(d35.status === "on_track", "day 35 on_track (planned 79.9, tolerance 0.7)", d35.status);
check(within(d35.band.expected, "2027-02-18", 1), "day 35 expected around Feb 18 (±1)", String(d35.band.expected));
check(within(d35.band.optimistic, "2027-02-11", 1) && within(d35.band.conservative, "2027-03-06", 1),
  "day 35 range Feb 11 – Mar 6 (±1)", `${d35.band.optimistic} – ${d35.band.conservative}`);
check(G.diffDays(d35.band.conservative!, d35.band.optimistic!) < G.diffDays(d0.band.conservative!, d0.band.optimistic!), "band narrows with data");
check(d35.chart!.actual.length === 36 && near(d35.chart!.todayIndex, 5), "chart actual 36 logs, todayIndex 5");
check(d35.whatIf === null, "day 35 whatIf hidden (< 7 days earlier)", JSON.stringify(d35.whatIf));

// ── Determinism ──────────────────────────────────────────────────────────────
check(JSON.stringify(projectGoal(fixtureDay35())) === JSON.stringify(d35), "same input twice → deep-equal output");
check(JSON.stringify(previewGoal(FIXTURE_ANSWERS, START)) === JSON.stringify(d0), "previewGoal deterministic");
const engineDir = fileURLToPath(new URL("../../../packages/contracts/src/goal-engine/", import.meta.url));
const clockHits = readdirSync(engineDir)
  .filter((f) => f.endsWith(".ts"))
  .filter((f) => /(?<![\w.])Date\.now|\bnew Date\b|(?<![\w.])Date\(|performance\.now|Math\.random|\bprocess\.|\brequire\(|from "node:/.test(readFileSync(engineDir + f, "utf8")));
check(clockHits.length === 0, "engine has no wall clock / random / Node APIs", clockHits.join(","));

// ── Wire shape ───────────────────────────────────────────────────────────────
const wire = GoalResponseSchema.safeParse({
  engineVersion: d35.engineVersion, plan: null, status: d35.status, band: d35.band, whatIf: d35.whatIf,
  trendKg: d35.trendKg, toGoKg: d35.toGoKg,
  adherence: { score: d35.adherence.score, training: d35.adherence.training, fuel: d35.adherence.fuel, checkIn: d35.adherence.checkIn },
  milestones: d35.milestones, flags: d35.flags, chart: d35.chart,
});
check(wire.success, "projection fits GoalResponseSchema", wire.success ? "" : wire.error.message.slice(0, 200));
const oldBody = { profile: { timezone: "America/New_York" }, preferences: { primaryGoal: "lose_fat", experience: "new", sessionMinutes: 45, cuisineStyles: ["american"] } };
check(OnboardingBodySchema.safeParse(oldBody).success, "old onboarding body (no commitment) validates");
check(OnboardingBodySchema.safeParse({ ...oldBody, commitment: { committedAt: 1793750400000 } }).success &&
  OnboardingBodySchema.safeParse({ ...oldBody, commitment: null }).success &&
  !OnboardingBodySchema.safeParse({ ...oldBody, commitment: { committedAt: 1.5 } }).success, "commitment: int | null | omitted");

runSchemaAsserts(check);
runEdgeAsserts(check, { near, within });

console.log(`\n${passes} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
console.log("PASS goal");
