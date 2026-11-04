/** Goal engine edge cases (AMI-178). Run via assert-goal.ts. */
import { goalEngine as G, projectGoal, type GoalInput, type GoalProfileInput } from "@mirra/contracts";

import type { Check } from "./assert-goal";

type Helpers = {
  near: (a: number | null | undefined, b: number, eps?: number) => boolean;
  within: (d: string | null | undefined, want: string, days: number) => boolean;
};
const S = "2026-11-04";
const prof = (o: Partial<GoalProfileInput> = {}): GoalProfileInput => ({
  goalType: "fat_loss", pace: "steady", experience: "months", sex: "male", ageYears: 29, heightCm: 180,
  startWeightKg: 82, targetWeightKg: 75, trainDaysPerWeek: 4, units: "metric", ...o,
});
const run = (o: Partial<GoalProfileInput> = {}, x: Partial<GoalInput> = {}) => projectGoal({ profile: prof(o), startDate: S, today: S, ...x });
const daily = (days: number, kgAt: (d: number) => number, from = S) =>
  Array.from({ length: days + 1 }, (_, d) => ({ date: G.addDays(from, d), kg: Math.round(kgAt(d) * 10) / 10 }));

export const runEdgeAsserts = (check: Check, { near, within }: Helpers) => {
  // ── Dates (local calendar, no TZ / DST drift) ──
  check(G.addDays("2026-03-07", 1) === "2026-03-08" && G.addDays("2026-03-07", 7) === "2026-03-14", "US DST start (Mar 8) adds whole days");
  check(G.addDays("2026-10-31", 1) === "2026-11-01" && G.diffDays("2026-11-08", "2026-10-25") === 14, "US DST end (Nov 1) / EU (Oct 25) spans");
  check(G.addDays("2028-02-28", 1) === "2028-02-29" && G.addDays("2027-02-28", 1) === "2027-03-01", "leap year handling");
  check(G.addDays("2026-12-31", 1) === "2027-01-01" && G.diffDays("2027-03-06", S) === 122, "year rollover; Nov 4 + 122 = Mar 6");
  check(!G.isIsoDate("2026-02-30") && !G.isIsoDate("2026-13-01") && G.isIsoDate("2024-02-29"), "isIsoDate rejects impossible dates");
  const dst = run({}, { startDate: "2026-03-01", today: "2026-03-01" });
  check(G.diffDays(dst.band.expected!, "2026-03-01") === 122, "ETA offset identical across a DST start (122 days)", String(dst.band.expected));

  // ── Rates table ──
  const gain = (e: GoalProfileInput["experience"], pace: GoalProfileInput["pace"]) => G.ratePct("muscle_gain", "up", pace ?? "steady", e);
  check(gain("new", "steady") === 0.0035 && gain("months", "steady") === 0.003 && gain("y1_2", "steady") === 0.0025 && gain("y3_plus", "steady") === 0.0015, "gain steady by experience 0.35/0.30/0.25/0.15 %");
  check(near(gain("new", "aggressive"), 0.005, 1e-9) && near(gain("months", "aggressive"), 0.0042, 1e-9) &&
    near(gain("y3_plus", "aggressive"), 0.0021, 1e-9), "gain aggressive ×1.4 (capped 0.5 %)");
  const mg = run({ goalType: "muscle_gain", experience: "new", pace: "aggressive", startWeightKg: 70, targetWeightKg: 76 });
  check(mg.direction === "up" && near(mg.paceRateKg, 0.35, 0.001) && mg.paceRateKg <= 0.005 * 70 + 1e-9, "muscle gain 70 kg new aggressive = 0.35 kg/wk (cap 0.5 % BW)", String(mg.paceRateKg));
  check(mg.milestones.map((m) => m.id).join(",") === "strength_first,plus1kg,halfway,goal", "muscle-gain milestones", mg.milestones.map((m) => m.id).join(","));
  check(mg.kcalHint !== null && mg.kcalHint > Math.round(G.bmr("male", 29, 180, 70) * G.activityFactor(4)), "gain kcal hint above TDEE");
  const heavy = run({ pace: "aggressive", startWeightKg: 150, targetWeightKg: 110, heightCm: 190 });
  check(heavy.paceRateKg === 1, "fat loss capped at 1.0 kg/wk (150 kg aggressive)", String(heavy.paceRateKg));
  const light = G.planPace({ goalType: "fat_loss", direction: "down", pace: "steady", experience: "new", sex: null, ageYears: null, heightCm: null, trainDaysPerWeek: 3, weightKg: 40 });
  check(light.rateKg === 0.25 && light.kcalHint === null, "fat loss floored at 0.25 kg/wk; no age/height → no kcal hint");

  // ── Safety ──
  const minor = run({ ageYears: 17, pace: "aggressive" });
  check(minor.pace === "steady" && minor.flags.includes("minor_pace") && minor.band.expected === run({ ageYears: 17 }).band.expected, "age 17 aggressive → steady + minor_pace");
  check(!run({ ageYears: 18, pace: "aggressive" }).flags.includes("minor_pace"), "age 18 keeps aggressive");
  const bmi = run({ targetWeightKg: 55 });
  check(bmi.targetEffectiveKg === 60 && bmi.flags.includes("target_below_healthy") && bmi.chart?.targetKg === 60, "180 cm target 55 → clamped to BMI 18.5 (60 kg)", String(bmi.targetEffectiveKg));
  check(G.healthyMinKg(150) === 41.7 && G.healthyMinKg(200) === 74, "healthyMinKg rounds up to 0.1 kg");
  const floor = run({ sex: "female", ageYears: 30, heightCm: 155, startWeightKg: 50, targetWeightKg: 46, pace: "aggressive", trainDaysPerWeek: 3 });
  check(floor.flags.includes("kcal_floor") && floor.kcalHint === 1200 && floor.paceRateKg < 0.5, "female 50 kg / 155 cm aggressive → kcal floor 1,200, rate reduced", `${floor.kcalHint} ${floor.paceRateKg}`);
  const unspec = G.planPace({ goalType: "fat_loss", direction: "down", pace: "aggressive", experience: "new", sex: "unspecified", ageYears: 40, heightCm: 160, trainDaysPerWeek: 0, weightKg: 55 });
  check(unspec.kcalHint === 1350 && unspec.flags.includes("kcal_floor"), "unspecified sex: BMR const −78, floor 1,350", String(unspec.kcalHint));
  check(near(G.bmr("unspecified", 30, 170, 70), 10 * 70 + 6.25 * 170 - 150 - 78, 1e-9), "Mifflin unspecified mean constant");
  check(run({ ageYears: null }).kcalHint === null && run({ heightCm: null }).kcalHint === null, "missing age or height → kcalHint null");
  const far = run({ goalType: "strength", startWeightKg: 100, targetWeightKg: 60, heightCm: 175 });
  check(far.flags.includes("beyond_horizon") && far.band.expected === null && far.band.weeksExpected === null, "slow cut over 40 kg → beyond_horizon, eta null");
  const sim = G.simulate({ w0: 100, pct: 0.001, direction: "down", targetKg: 60, minKg: 0.25, maxKg: 1 });
  check(!sim.reached && sim.weeks === null && sim.points.length === 105 && near(sim.points[104], 74, 0.01), "0.25 kg/wk over 40 kg: 104-week cap");
  const s2 = G.simulate({ w0: 82, pct: 0.006, direction: "down", targetKg: 75, minKg: 0.25, maxKg: 0.82 });
  check(s2.reached && near(s2.weeks, 14.83, 0.01) && s2.points[s2.points.length - 1] === 75, "simulate: fractional last week, ends on target", String(s2.weeks));

  // ── Direction / modes ──
  const mm = run({ goalType: "muscle_gain", targetWeightKg: 78 });
  check(mm.direction === "down" && mm.flags.includes("direction_mismatch") && near(mm.paceRatePct, 0.4, 1e-6) && mm.milestones[0]?.id === "first_change",
    "build_muscle with lower goal → cut at slow-cut 0.4 %, direction_mismatch", `${mm.direction} ${mm.paceRatePct}`);
  check(run({ targetWeightKg: 88 }).flags.includes("direction_mismatch"), "lose_fat with higher goal → direction_mismatch");
  const same = run({ targetWeightKg: 82 });
  const halfKg = run({ targetWeightKg: 81.5 });
  check(same.direction === "hold" && same.mode === "milestones" && same.band.expected === null && halfKg.direction === "hold", "target = current (or <1 kg) → hold");
  check(same.chart !== null && same.chart.optimistic[0] === 83.23 && same.chart.conservative[0] === 80.77, "hold band ± max(1 kg, 1.5 % BW)");
  const holdOk = run({ goalType: "recomp", targetWeightKg: null }, { today: "2026-12-09", logs: daily(35, (d) => 82 + (d % 2 ? 0.3 : -0.3)) });
  const holdOut = run({ goalType: "recomp", targetWeightKg: null }, { today: "2026-12-09", logs: daily(35, (d) => 82 + d * 0.1) });
  check(holdOk.status === "on_track" && holdOut.status === "behind" && holdOk.mode === "milestones", "hold status: inside band on_track, outside behind", `${holdOk.status} ${holdOut.status}`);
  const hz = run({ targetWeightKg: null });
  check(hz.mode === "horizon" && hz.status === "no_target" && hz.band.expected === null && hz.whatIf === null && hz.chart?.planned.length === 13,
    "no goal weight → horizon, no_target, 12-week line", `${hz.mode} ${hz.chart?.planned.length}`);
  check(hz.milestones.some((m) => m.id === "first_change") && !hz.milestones.some((m) => m.id === "goal" || m.id === "halfway"), "horizon keeps data-only milestones");
  const noW = run({ startWeightKg: null, targetWeightKg: null });
  check(noW.chart === null && noW.status === "no_target" && noW.kcalHint === null, "no weight at all → no chart, no crash");

  // ── Trend / logs ──
  const allCheckIns = Array.from({ length: 28 }, (_, i) => G.addDays("2026-12-07", i));
  const empty = run({}, { today: "2027-01-03", checkInDates: allCheckIns });
  check(empty.status === "calibrating" && empty.adherence.score === 1 && empty.band.expected === "2027-02-16",
    "missing logs: calibrating, ETA counted from start (A = 1 → Feb 16)", `${empty.status} ${empty.band.expected}`);
  const early = run({}, { today: "2026-11-09", logs: daily(5, (d) => 82 - 0.07 * d) });
  check(early.status === "calibrating" && early.adherence.prior, "< 14 days → calibrating, prior adherence");
  const pre = run({}, { today: "2026-12-09", logs: [{ date: "2026-10-01", kg: 95 }, ...daily(35, (d) => 81.6 - 0.07 * d)] });
  check(pre.chart!.actual.length === 36 && (pre.trendKg ?? 99) < 80, "logs before start ignored");
  const noisy = run({}, { today: "2026-12-30", logs: daily(56, (d) => 82 - 0.07 * d + (d % 2 ? 1 : -1)) });
  check(near(noisy.trendKg, 82 - 0.07 * 56 + 0.6, 0.8) && noisy.observedKgWk !== null && near(noisy.observedKgWk, -0.49, 0.1), "noisy ±1 kg logs: trend and slope stay sane", `${noisy.trendKg} ${noisy.observedKgWk}`);
  const sparse = run({}, { today: "2026-11-30", logs: [{ date: S, kg: 82 }, { date: "2026-11-30", kg: 80.4 }] });
  check(sparse.status !== "calibrating" || sparse.observedKgWk === null, "2 logs: trend invalid (needs ≥3 over ≥14 days)");
  const rev = run({}, { today: "2026-12-30", logs: daily(56, (d) => (d < 28 ? 82 - 0.07 * d : 80.04 + 0.08 * (d - 28))) });
  check(rev.flags.includes("trend_reversed") && rev.status === "behind" && near(rev.rates.expected, rev.rates.plan, 1e-3), "≥21 days of gain on a cut → trend_reversed, behind, ETA at plan rate", `${rev.status} ${rev.rates.expected}/${rev.rates.plan}`);
  const blip = run({}, { today: "2026-12-30", logs: daily(56, (d) => (d < 49 ? 82 - 0.07 * d : 78.57 + 0.1 * (d - 49))) });
  check(!blip.flags.includes("trend_reversed"), "one week of gain is not a reversal");
  const ahead = run({}, { today: "2026-12-09", logs: daily(35, (d) => 82 - 0.2 * d) });
  check(ahead.status === "ahead", "far below planned line → ahead", ahead.status);
  const done = run({}, { today: "2027-02-01", logs: daily(89, (d) => 82 - 0.09 * d) });
  check(done.milestones.find((m) => m.id === "goal")?.done === true && done.band.expected === "2027-02-01" && done.toGoKg === 0, "target reached → goal done, ETA today");

  // ── Adherence / whatIf ──
  const sess = (n: number, ok: (i: number) => boolean) => Array.from({ length: n }, (_, i) => ({ date: G.addDays("2026-11-12", i * 2), done: ok(i) }));
  const zero = run({}, { today: "2026-12-09", sessions: sess(14, () => false), fuelDays: Array.from({ length: 10 }, (_, i) => ({ date: G.addDays("2026-11-20", i), onTarget: false })) });
  check(zero.adherence.score === 0 && zero.adherence.multiplier === 0.6 && near(zero.rates.expected, 0.6 * zero.rates.pace, 1e-3), "adherence 0 → M = 0.6");
  const fewFuel = run({}, { today: "2026-12-09", sessions: sess(14, () => true), fuelDays: [{ date: "2026-12-01", onTarget: false }] });
  check(fewFuel.adherence.fuel === null && near(fewFuel.adherence.score, 0.3 / 0.5, 1e-9), "fuel < 7 logged days dropped, weights renormalized", String(fewFuel.adherence.score));
  check(zero.whatIf !== null && zero.whatIf.lever === "fuel" && G.diffDays(zero.band.expected!, zero.whatIf.eta) >= 7, "whatIf shown when ≥7 days earlier, lever = biggest gap");
  const full = run({}, { today: "2026-12-09", sessions: sess(14, () => true), checkInDates: Array.from({ length: 28 }, (_, i) => G.addDays("2026-11-12", i)) });
  check(full.adherence.score === 1 && full.whatIf === null, "full adherence → whatIf hidden (< 7 days earlier)");

  // ── Milestones per goal ──
  const str = run({ goalType: "strength", targetWeightKg: null }, { today: "2026-12-09", strength: { stepUps28d: 1, next: { label: "Bench press Silver I", detail: "80 kg × 8 for 2 sessions", sessions: 3, perWeek: 2 } } });
  const nd = str.milestones.find((m) => m.id === "next_division");
  check(nd?.date === "2026-12-23" && nd.label === "Bench press Silver I" && str.status === "on_track", "strength next_division = today + ceil(3/2) weeks; step-up → on_track", JSON.stringify(nd));
  check(run({ goalType: "strength", targetWeightKg: null }, { today: "2026-12-09", sessions: sess(10, (i) => i < 3) }).status === "behind", "strength training < 0.5 → behind");
  const habitSessions = Array.from({ length: 40 }, (_, i) => ({ date: G.addDays(S, i * 2), done: i % 5 !== 4 }));
  const gf = run({ goalType: "general_fitness", targetWeightKg: null }, { today: "2027-01-08", sessions: habitSessions });
  const hb = gf.milestones.filter((m) => m.kind === "habit");
  check(hb.map((m) => `${m.id}:${m.date}:${m.done}`).join(",") === "habit14:2026-11-18:true,habit30:2026-12-04:true,habit66:2027-01-09:false",
    "general_fitness habit 14/30/66", hb.map((m) => `${m.id}:${m.date}:${m.done}`).join(","));
  check(gf.status === "on_track" && hb[2]?.detail?.includes("66 days") === true, "habit status on_track at ≥75 %; 66-day copy");
  const rc = run({ goalType: "recomp", targetWeightKg: null }, { today: "2026-12-09", sessions: sess(14, () => true), checkInDates: Array.from({ length: 28 }, (_, i) => G.addDays("2026-11-12", i)), photoDates: ["2026-12-03"] });
  check(rc.milestones[0]?.id === "first_change" && JSON.stringify(rc.milestones[0]?.window) === '["2026-12-30","2027-01-27"]', "recomp first change window weeks 8–12 when A ≥ 0.75");
  check(rc.milestones.find((m) => m.id === "photo_w4")?.done === true && !run({ goalType: "recomp", targetWeightKg: null }).milestones.some((m) => m.id === "first_change"), "photo checkpoint done ±7 days; no first change at prior A");
  check(run({}, { strength: { stepUps28d: 0, next: { label: "Squat Gold III", detail: null, sessions: 2, perWeek: 0 } } }).milestones.at(-1)?.date === null, "next_division appended to any goal; perWeek 0 → no date");
  check(run({ startWeightKg: 120, targetWeightKg: 70, heightCm: 190 }).milestones.length <= 8, "milestones ≤ 8");

  // ── Units ──
  const lb = run({ units: "imperial" });
  const kg = run();
  check(lb.band.expected === kg.band.expected && lb.chart?.unit === "lb" && JSON.stringify(lb.chart?.planned) === JSON.stringify(kg.chart?.planned), "imperial: same math, chart unit lb (values stay kg)");
  check(lb.milestones.find((m) => m.id === "halfway")?.label === "Halfway · 173.1 lb" && lb.milestones[0]?.detail === "−5.4 lb", "imperial labels in lb", lb.milestones.map((m) => m.label).join(" | "));
  check(near(G.lbToKg(180.78), 82, 0.01) && near(G.kgToLb(G.lbToKg(165)), 165, 1e-9) && G.formatWeight(75, "imperial") === "165.3 lb", "lb ↔ kg conversions");

  // ── Shape invariants ──
  for (const p of [kg, mg, zero, run({ pace: "aggressive" })]) {
    const b = p.band;
    const ordered = b.optimistic! <= b.expected! && b.expected! <= b.conservative!;
    const c = p.chart!;
    const fan = c.optimistic.every((v, i) => (p.direction === "down" ? v <= c.conservative[i]! + 1e-9 : v >= c.conservative[i]! - 1e-9));
    check(ordered && fan && c.planned.length === c.optimistic.length && c.planned.length <= 105, `band ordered + chart fan (${p.goalType} ${p.pace})`);
  }
  const fut = run({}, { today: "2026-10-01" });
  check(fut.band.expected === kg.band.expected, "today before start → treated as start");
};
