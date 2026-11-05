/**
 * D1 rows → goal engine inputs (AMI-179, arch §3–§4). Pure: no D1, no clock.
 * The engine itself lives in `@mirra/contracts` (`goalEngine`); this only reshapes rows.
 */
import {
  toGoalType,
  type Experience,
  type GoalProfileInput,
  type GoalType,
  type Pace,
  type PrimaryGoal,
  type Sex,
  type Units,
} from "@mirra/contracts";

import { localDateIn } from "../dates";
import { parseJson } from "../json";

type IsoDate = string;

const PRIMARY_GOALS: readonly PrimaryGoal[] = ["lose_fat", "build_muscle", "recomp", "performance", "consistency"];
const EXPERIENCES: readonly Experience[] = ["new", "months", "y1_2", "y3_plus"];
const SEXES: readonly Sex[] = ["female", "male", "unspecified"];

const oneOf = <T extends string>(xs: readonly T[], v: unknown): T | null =>
  typeof v === "string" && (xs as readonly string[]).includes(v) ? (v as T) : null;

/** §4 plan-version keys: a change in any of these writes a new `goal_plans` version. */
export type GoalSettings = {
  primaryGoal: PrimaryGoal;
  goalType: GoalType;
  pace: Pace | null;
  targetWeightKg: number | null;
  sex: Sex | null;
  ageYears: number | null;
  heightCm: number | null;
  experience: Experience;
  trainDaysPerWeek: number;
  /** Display only: never forces a new version. */
  units: Units;
};

/** Stored in `goal_plans.inputs_json`. */
export type PlanInputsJson = Pick<GoalSettings, "sex" | "ageYears" | "heightCm" | "experience" | "units"> & {
  trainDays: number;
};

export type ProfileLike = {
  sex: string | null;
  ageYears: number | null;
  heightCm: number | null;
  weightKg: number | null;
  goalWeightKg: number | null;
  pace: string | null;
};
export type PrefsLike = { primaryGoal: string; experience: string; trainDaysJson: string; units: string };

/** Current goal settings from `profiles` + `preferences` (missing prefs = consistency / new). */
export const settingsFrom = (p: ProfileLike | undefined, pf: PrefsLike | undefined): GoalSettings => {
  const primaryGoal = oneOf(PRIMARY_GOALS, pf?.primaryGoal) ?? "consistency";
  const days = parseJson<unknown[]>(pf?.trainDaysJson ?? "[]", []);
  return {
    primaryGoal,
    goalType: toGoalType(primaryGoal),
    pace: p?.pace === "steady" || p?.pace === "aggressive" ? p.pace : null,
    targetWeightKg: p?.goalWeightKg ?? null,
    sex: oneOf(SEXES, p?.sex),
    ageYears: p?.ageYears ?? null,
    heightCm: p?.heightCm ?? null,
    experience: oneOf(EXPERIENCES, pf?.experience) ?? "new",
    trainDaysPerWeek: Array.isArray(days) ? new Set(days.filter((d) => typeof d === "number")).size : 0,
    units: pf?.units === "imperial" ? "imperial" : "metric",
  };
};

const VERSION_KEYS = [
  "goalType",
  "pace",
  "targetWeightKg",
  "sex",
  "ageYears",
  "heightCm",
  "experience",
  "trainDaysPerWeek",
] as const satisfies readonly (keyof GoalSettings)[];

/** True when any §4 input differs (units and primaryGoal aliases of the same goal type do not count). */
export const settingsChanged = (a: GoalSettings, b: GoalSettings): boolean =>
  VERSION_KEYS.some((k) => a[k] !== b[k]);

/** `PATCH /v1/me/profile` body keys that can change a §4 input. */
export const GOAL_PROFILE_KEYS = [
  "sex",
  "ageYears",
  "heightCm",
  "goalWeightKg",
  "pace",
  "primaryGoal",
  "experience",
  "trainDays",
] as const;

export const touchesGoal = (body: Record<string, unknown>): boolean =>
  GOAL_PROFILE_KEYS.some((k) => body[k] !== undefined);

export const inputsJsonOf = (s: GoalSettings): PlanInputsJson => ({
  sex: s.sex,
  ageYears: s.ageYears,
  heightCm: s.heightCm,
  experience: s.experience,
  trainDays: s.trainDaysPerWeek,
  units: s.units,
});

export type PlanRowLike = {
  goalType: string;
  primaryGoal: string;
  pace: string | null;
  startWeightKg: number | null;
  targetWeightKg: number | null;
  inputsJson: string;
};

/** Settings frozen on a plan row (units come from current prefs). */
export const settingsOfPlan = (plan: PlanRowLike, units: Units): GoalSettings => {
  const inputs = parseJson<Partial<PlanInputsJson>>(plan.inputsJson, {});
  const primaryGoal = oneOf(PRIMARY_GOALS, plan.primaryGoal) ?? "consistency";
  return {
    primaryGoal,
    goalType: toGoalType(primaryGoal),
    pace: plan.pace === "steady" || plan.pace === "aggressive" ? plan.pace : null,
    targetWeightKg: plan.targetWeightKg,
    sex: oneOf(SEXES, inputs.sex),
    ageYears: inputs.ageYears ?? null,
    heightCm: inputs.heightCm ?? null,
    experience: oneOf(EXPERIENCES, inputs.experience) ?? "new",
    trainDaysPerWeek: inputs.trainDays ?? 0,
    units,
  };
};

export const profileInputOf = (s: GoalSettings, startWeightKg: number | null): GoalProfileInput => ({
  goalType: s.goalType,
  pace: s.pace,
  experience: s.experience,
  sex: s.sex,
  ageYears: s.ageYears,
  heightCm: s.heightCm,
  startWeightKg,
  targetWeightKg: s.targetWeightKg,
  trainDaysPerWeek: s.trainDaysPerWeek,
  units: s.units,
});

const ms = (v: Date | number): number => (v instanceof Date ? v.getTime() : Number(v));
export const localDay = (tz: string, at: Date | number): IsoDate => localDateIn(tz, new Date(ms(at)));

export const toWeightLogs = (rows: readonly { kg: number; loggedAt: Date | number }[], tz: string) =>
  rows.map((r) => ({ date: localDay(tz, r.loggedAt), kg: r.kg }));

/**
 * Planned lift days (latest plan version wins per date) → `{ date, done }`.
 * Today counts only once done, so an evening session is never a miss at noon.
 */
export const toSessionDays = (
  planned: readonly { date: IsoDate; version: number }[],
  doneDates: ReadonlySet<IsoDate>,
  today: IsoDate,
) => {
  const latest = new Map<IsoDate, number>();
  for (const p of planned) latest.set(p.date, Math.max(latest.get(p.date) ?? -1, p.version));
  return [...latest.keys()]
    .sort()
    .filter((date) => date < today || doneDates.has(date))
    .map((date) => ({ date, done: doneDates.has(date) }));
};

/** Days with any meal (today excluded: partial) → on target when within ±10 % of `kcalTarget`. */
export const toFuelDays = (
  meals: readonly { eatenAt: Date | number; kcal: number }[],
  tz: string,
  kcalTarget: number,
  today: IsoDate,
) => {
  const byDay = new Map<IsoDate, number>();
  for (const m of meals) {
    const d = localDay(tz, m.eatenAt);
    if (d < today) byDay.set(d, (byDay.get(d) ?? 0) + m.kcal);
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, kcal]) => ({ date, onTarget: kcalTarget > 0 && Math.abs(kcal - kcalTarget) <= kcalTarget * 0.1 }));
};
