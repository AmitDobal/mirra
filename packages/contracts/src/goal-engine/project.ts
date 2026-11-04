/**
 * `projectGoal(input) → GoalProjection` (§3). Deterministic: no I/O, no clock.
 */
import { M_PRIOR, computeAdherence } from "./adherence";
import { bandRates, trendWeight } from "./band";
import { buildChart } from "./chart";
import { dateAfterWeeks, diffDays, maxDate } from "./dates";
import { buildMilestones, type Reach } from "./milestones";
import { BAND_MIN_KG, clamp, healthyMinKg, holdBandKg, planPace, resolveDirection, round, type PacePlanInput } from "./rates";
import { HORIZON_WEEKS, MAX_WEEKS, sampleAt, simulate } from "./simulate";
import { resolveStatus } from "./status";
import { computeTrend, isTrendReversed } from "./trend";
import {
  ENGINE_VERSION,
  GOAL_FLAGS,
  type GoalDirection,
  type GoalFlag,
  type GoalInput,
  type GoalMode,
  type GoalProjection,
  type IsoDate,
} from "./types";

const WHAT_IF_MIN_DAYS = 7;
const isWeightGoal = (g: string) => g === "fat_loss" || g === "muscle_gain";

export const projectGoal = (input: GoalInput): GoalProjection => {
  const p = input.profile;
  const startDate = input.startDate;
  const today = maxDate(input.today, startDate);
  const daysSince = diffDays(today, startDate);
  const flags = new Set<GoalFlag>();

  const trend = computeTrend(input.logs ?? [], startDate, today);
  const startKg = p.startWeightKg ?? trend.points[0]?.kg ?? null;
  const currentKg = trend.trendKg ?? startKg;
  // ETA counts from today once there is a weigh-in, else from the start date.
  const origin: IsoDate = trend.points.length > 0 ? today : startDate;

  let targetKg = p.targetWeightKg;
  if (targetKg !== null && p.heightCm !== null && p.heightCm > 0) {
    const min = healthyMinKg(p.heightCm);
    if (targetKg < min) {
      targetKg = min;
      flags.add("target_below_healthy");
    }
  }
  const weightGoal = isWeightGoal(p.goalType);
  const direction: GoalDirection = startKg !== null && targetKg !== null ? resolveDirection(startKg, targetKg) : "hold";
  const mode: GoalMode =
    startKg === null || targetKg === null ? (weightGoal ? "horizon" : "milestones") : direction === "hold" ? "milestones" : "eta";
  const dir: GoalDirection = mode === "horizon" ? (p.goalType === "fat_loss" ? "down" : "up") : direction;
  const mismatch = mode === "eta" && ((p.goalType === "fat_loss" && dir === "up") || (p.goalType === "muscle_gain" && dir === "down"));
  if (mismatch) flags.add("direction_mismatch");

  const paceInput = (weightKg: number): PacePlanInput => ({
    goalType: mismatch ? "recomp" : p.goalType,
    direction: dir,
    pace: p.pace,
    experience: p.experience,
    sex: p.sex,
    ageYears: p.ageYears,
    heightCm: p.heightCm,
    trainDaysPerWeek: p.trainDaysPerWeek,
    weightKg,
  });
  const pace = planPace(paceInput(currentKg ?? 0));
  for (const f of pace.flags) flags.add(f);

  const adherence = computeAdherence({
    goalType: p.goalType,
    startDate,
    today,
    sessions: input.sessions,
    fuelDays: input.fuelDays,
    checkInDates: input.checkInDates,
  });

  const reversed = isTrendReversed(trend, dir);
  if (reversed) flags.add("trend_reversed");
  // A reversal is never extrapolated: project from today's trend at the plan rate.
  const w = reversed ? 0 : trendWeight(trend.valid, trend.spanDays);
  const sign = dir === "down" ? -1 : 1;
  const observed = trend.slopeKgWk === null ? 0 : clamp(sign * trend.slopeKgWk, 0, pace.bounds.maxKg);
  const r = bandRates(pace.rateKg, adherence.multiplier, w, observed, pace.bounds.maxKg);
  const whatIfRate = bandRates(pace.rateKg, 1, w, observed, pace.bounds.maxKg).expected;

  const sim = (rateKg: number, target: number | null, maxWeeks: number) =>
    simulate({
      w0: currentKg ?? 0,
      pct: currentKg ? rateKg / currentKg : 0,
      direction: currentKg === null ? "hold" : dir,
      targetKg: target,
      minKg: Math.min(BAND_MIN_KG, rateKg),
      maxKg: pace.bounds.maxKg,
      maxWeeks,
    });
  const etaTo = (rateKg: number, target: number) => {
    if (currentKg === null || rateKg <= 0) return null;
    const s = sim(rateKg, target, MAX_WEEKS);
    return s.reached && s.weeks !== null ? dateAfterWeeks(origin, s.weeks) : null;
  };
  const lineFor = (rateKg: number) => sim(rateKg, mode === "eta" ? targetKg : null, mode === "eta" ? MAX_WEEKS : HORIZON_WEEKS);

  let band: GoalProjection["band"] = { optimistic: null, expected: null, conservative: null, weeksExpected: null };
  let whatIf: GoalProjection["whatIf"] = null;
  if (mode === "eta" && targetKg !== null) {
    const exp = sim(r.expected, targetKg, MAX_WEEKS);
    band = {
      optimistic: etaTo(r.optimistic, targetKg),
      expected: exp.reached && exp.weeks !== null ? dateAfterWeeks(origin, exp.weeks) : null,
      conservative: etaTo(r.conservative, targetKg),
      weeksExpected: exp.reached && exp.weeks !== null ? round(exp.weeks, 1) : null,
    };
    if (!exp.reached) flags.add("beyond_horizon");
    const wi = etaTo(whatIfRate, targetKg);
    if (wi && band.expected && diffDays(band.expected, wi) >= WHAT_IF_MIN_DAYS) whatIf = { eta: wi, lever: adherence.lever };
  }

  // Planned line: from the frozen start at the prior expected rate (stored in goal_plans).
  let plannedLine: number[];
  if (input.plannedLine && input.plannedLine.length > 0) plannedLine = [...input.plannedLine];
  else if (startKg === null) plannedLine = [];
  else {
    const p0 = planPace(paceInput(startKg));
    const pl = simulate({
      w0: startKg,
      pct: p0.pct * M_PRIOR,
      direction: dir,
      targetKg: mode === "eta" ? targetKg : null,
      minKg: Math.min(BAND_MIN_KG, p0.rateKg * M_PRIOR),
      maxKg: p0.bounds.maxKg,
      maxWeeks: mode === "eta" ? MAX_WEEKS : HORIZON_WEEKS,
    });
    plannedLine = pl.points.map((v) => round(v));
  }
  const plannedKg = plannedLine.length > 0 ? sampleAt(plannedLine, daysSince / 7) : null;

  const status = resolveStatus({
    goalType: p.goalType,
    mode,
    direction: dir,
    daysSinceStart: daysSince,
    logCount: trend.points.length,
    startKg,
    targetKg,
    currentKg,
    plannedKg,
    reversed,
    adherence,
    stepUps28d: input.strength?.stepUps28d ?? 0,
  });

  const reach = (kg: number): Reach => ({
    expected: etaTo(r.expected, kg),
    optimistic: etaTo(r.optimistic, kg),
    conservative: etaTo(r.conservative, kg),
  });
  const milestones = buildMilestones({
    goalType: p.goalType,
    mode,
    direction: dir,
    units: p.units,
    startDate,
    today,
    startKg,
    targetKg: mode === "eta" ? targetKg : null,
    currentKg,
    points: trend.points,
    adherenceScore: adherence.score,
    sessions: input.sessions ?? [],
    photoDates: input.photoDates ?? [],
    strengthNext: input.strength?.next ?? null,
    strengthStepUps: input.strength?.stepUps28d ?? 0,
    reach,
  });

  const hold = mode === "milestones" && startKg !== null && currentKg !== null;
  const opt = lineFor(r.optimistic);
  const cons = lineFor(r.conservative);
  const chart = buildChart({
    startDate,
    daysSinceStart: daysSince,
    units: p.units,
    startKg,
    currentKg,
    targetKg: mode === "eta" ? targetKg : null,
    plannedLine,
    optimistic: opt.points,
    conservative: cons.points,
    holdBandKg: hold ? holdBandKg(startKg) : null,
    futureWeeks: mode === "eta" ? Math.max(opt.points.length, cons.points.length) - 1 : HORIZON_WEEKS,
    points: trend.points,
  });

  const toGoKg =
    mode === "eta" && targetKg !== null && currentKg !== null ? round(Math.max(0, sign * (targetKg - currentKg)), 1) : null;

  return {
    engineVersion: ENGINE_VERSION,
    goalType: p.goalType,
    direction: dir,
    mode,
    pace: pace.pace,
    startDate,
    startWeightKg: startKg,
    targetWeightKg: p.targetWeightKg,
    targetEffectiveKg: targetKg,
    currentKg: currentKg === null ? null : round(currentKg, 2),
    paceRatePct: round(pace.pct * 100, 3),
    paceRateKg: round(pace.rateKg, 3),
    kcalHint: pace.kcalHint,
    rates: {
      pace: round(pace.rateKg, 3),
      plan: round(r.plan, 3),
      expected: round(r.expected, 3),
      optimistic: round(r.optimistic, 3),
      conservative: round(r.conservative, 3),
      whatIf: round(whatIfRate, 3),
    },
    band,
    whatIf,
    status,
    trendKg: trend.trendKg === null ? null : round(trend.trendKg, 2),
    observedKgWk: trend.slopeKgWk === null ? null : round(trend.slopeKgWk, 3),
    toGoKg,
    adherence,
    milestones,
    flags: GOAL_FLAGS.filter((f) => flags.has(f)),
    plannedLine,
    chart,
  };
};
