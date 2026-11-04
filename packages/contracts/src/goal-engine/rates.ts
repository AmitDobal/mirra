/**
 * §2 rate table, safety clamps and the kcal hint. Pure.
 */
import type { GoalDirection, GoalExperience, GoalFlag, GoalPace, GoalSex, GoalType } from "./types";

/** Direction needs |target − start| ≥ this, else `hold`. */
export const DIRECTION_MIN_KG = 1;
export const HEALTHY_BMI_MIN = 18.5;
export const KCAL_PER_KG_WEEK = 1100;
export const GAIN_SURPLUS_MIN = 150;
export const GAIN_SURPLUS_MAX = 500;
/** Band rates never drop below this (§3 conservative floor). */
export const BAND_MIN_KG = 0.1;

const LOSS_MIN_KG = 0.25;
const LOSS_MAX_KG = 1.0;
const LOSS_MAX_PCT = 0.01;
const GAIN_MIN_KG = 0.1;
const GAIN_MAX_PCT = 0.005;
const HOLD_BAND_MIN_KG = 1;
const HOLD_BAND_PCT = 0.015;

/** % BW / week as a fraction: [steady, aggressive]. */
const FAT_LOSS: [number, number] = [0.006, 0.01];
const MUSCLE_GAIN: Record<GoalExperience, [number, number]> = {
  new: [0.0035, 0.005],
  months: [0.003, 0.0042],
  y1_2: [0.0025, 0.0035],
  y3_plus: [0.0015, 0.0021],
};
const SLOW_CUT: [number, number] = [0.004, 0.006];
const SLOW_GAIN: [number, number] = [0.0015, 0.002];

const KCAL_FLOOR: Record<GoalSex, number> = { male: 1500, female: 1200, unspecified: 1350 };
const BMR_SEX_CONST: Record<GoalSex, number> = { male: 5, female: -161, unspecified: -78 };

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const round = (v: number, dp = 2) => {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
};

export const resolveDirection = (startKg: number, targetKg: number): GoalDirection => {
  const d = targetKg - startKg;
  if (Math.abs(d) < DIRECTION_MIN_KG) return "hold";
  return d < 0 ? "down" : "up";
};

/** Lowest target we project to: BMI 18.5 for the height, rounded up to 0.1 kg. */
export const healthyMinKg = (heightCm: number): number => {
  const m = heightCm / 100;
  return Math.ceil(HEALTHY_BMI_MIN * m * m * 10 - 1e-9) / 10;
};

/** §2 table. `direction` is the projected direction (after `direction_mismatch`). */
export const ratePct = (
  goalType: GoalType,
  direction: GoalDirection,
  pace: GoalPace,
  experience: GoalExperience,
): number => {
  if (direction === "hold") return 0;
  const i = pace === "aggressive" ? 1 : 0;
  if (goalType === "fat_loss" && direction === "down") return FAT_LOSS[i];
  if (goalType === "muscle_gain" && direction === "up") return MUSCLE_GAIN[experience][i];
  return direction === "down" ? SLOW_CUT[i] : SLOW_GAIN[i];
};

export type RateBounds = { minKg: number; maxKg: number };

export const rateBounds = (direction: GoalDirection, weightKg: number): RateBounds => {
  if (direction === "down") return { minKg: LOSS_MIN_KG, maxKg: Math.max(LOSS_MIN_KG, Math.min(LOSS_MAX_KG, LOSS_MAX_PCT * weightKg)) };
  if (direction === "up") return { minKg: GAIN_MIN_KG, maxKg: Math.max(GAIN_MIN_KG, GAIN_MAX_PCT * weightKg) };
  return { minKg: 0, maxKg: 0 };
};

/** ± kg around the start weight that counts as "holding". */
export const holdBandKg = (weightKg: number) => Math.max(HOLD_BAND_MIN_KG, HOLD_BAND_PCT * weightKg);

/** Mifflin-St Jeor. */
export const bmr = (sex: GoalSex, ageYears: number, heightCm: number, weightKg: number) =>
  10 * weightKg + 6.25 * heightCm - 5 * ageYears + BMR_SEX_CONST[sex];

export const activityFactor = (trainDays: number) =>
  trainDays <= 1 ? 1.2 : trainDays <= 3 ? 1.375 : trainDays <= 5 ? 1.55 : 1.725;

export const kcalFloor = (sex: GoalSex, bmrKcal: number) => Math.max(bmrKcal, KCAL_FLOOR[sex]);

export type PacePlan = {
  pace: GoalPace;
  /** Effective pace rate as a fraction of the given weight per week. */
  pct: number;
  rateKg: number;
  bounds: RateBounds;
  kcalHint: number | null;
  flags: GoalFlag[];
};

export type PacePlanInput = {
  goalType: GoalType;
  direction: GoalDirection;
  pace: GoalPace | null;
  experience: GoalExperience;
  sex: GoalSex | null;
  ageYears: number | null;
  heightCm: number | null;
  trainDaysPerWeek: number;
  weightKg: number;
};

/** Pace rate at `weightKg` with the minor and kcal-floor clamps applied (§2). */
export const planPace = (p: PacePlanInput): PacePlan => {
  const flags: GoalFlag[] = [];
  let pace: GoalPace = p.pace ?? "steady";
  if (pace === "aggressive" && p.ageYears !== null && p.ageYears < 18) {
    pace = "steady";
    flags.push("minor_pace");
  }
  const bounds = rateBounds(p.direction, p.weightKg);
  const raw = ratePct(p.goalType, p.direction, pace, p.experience) * p.weightKg;
  const noWeight = !(p.weightKg > 0);
  let rateKg = p.direction === "hold" || noWeight ? 0 : clamp(raw, bounds.minKg, bounds.maxKg);
  let kcalHint: number | null = null;

  if (p.ageYears !== null && p.heightCm !== null && !noWeight) {
    const sex = p.sex ?? "unspecified";
    const base = bmr(sex, p.ageYears, p.heightCm, p.weightKg);
    const tdee = base * activityFactor(p.trainDaysPerWeek);
    if (p.direction === "down") {
      const floor = kcalFloor(sex, base);
      if (tdee - rateKg * KCAL_PER_KG_WEEK < floor) {
        rateKg = Math.max(BAND_MIN_KG, (tdee - floor) / KCAL_PER_KG_WEEK);
        bounds.minKg = Math.min(bounds.minKg, rateKg);
        flags.push("kcal_floor");
      }
      kcalHint = Math.round(Math.max(floor, tdee - rateKg * KCAL_PER_KG_WEEK));
    } else if (p.direction === "up") {
      kcalHint = Math.round(tdee + clamp(rateKg * KCAL_PER_KG_WEEK, GAIN_SURPLUS_MIN, GAIN_SURPLUS_MAX));
    } else {
      kcalHint = Math.round(tdee);
    }
  }
  return { pace, pct: noWeight ? 0 : rateKg / p.weightKg, rateKg, bounds, kcalHint, flags };
};
