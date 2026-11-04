/**
 * Goal engine types (AMI-178, arch `docs/03-engineering/goal-timeline.md` §1–§3).
 * Plain TS only: the engine runs in React Native (onboarding, offline) and Workers.
 * Zod mirrors of the public shapes live in `../goal.ts`.
 */

export const ENGINE_VERSION = "goal-2026.11-v1";

export const GOAL_TYPES = ["fat_loss", "muscle_gain", "recomp", "strength", "general_fitness"] as const;
export const GOAL_STATUSES = ["on_track", "ahead", "behind", "calibrating", "no_target"] as const;
export const GOAL_FLAGS = [
  "direction_mismatch",
  "minor_pace",
  "target_below_healthy",
  "kcal_floor",
  "beyond_horizon",
  "trend_reversed",
] as const;
export const GOAL_DIRECTIONS = ["down", "up", "hold"] as const;
export const GOAL_MODES = ["eta", "horizon", "milestones"] as const;
export const GOAL_MILESTONE_KINDS = ["weight", "visual", "strength", "habit", "photo"] as const;
export const GOAL_LEVERS = ["training", "fuel", "check_in"] as const;

export type GoalType = (typeof GOAL_TYPES)[number];
export type GoalStatus = (typeof GOAL_STATUSES)[number];
export type GoalFlag = (typeof GOAL_FLAGS)[number];
export type GoalDirection = (typeof GOAL_DIRECTIONS)[number];
export type GoalMode = (typeof GOAL_MODES)[number];
export type GoalMilestoneKind = (typeof GOAL_MILESTONE_KINDS)[number];
export type GoalLever = (typeof GOAL_LEVERS)[number];

/** Local calendar date `YYYY-MM-DD` (the user's day, never a UTC instant). */
export type IsoDate = string;
export type GoalSex = "female" | "male" | "unspecified";
export type GoalPace = "steady" | "aggressive";
export type GoalExperience = "new" | "months" | "y1_2" | "y3_plus";
export type GoalUnits = "metric" | "imperial";

/** Plan inputs (§4 "new plan version" keys). All weights in kg. */
export type GoalProfileInput = {
  goalType: GoalType;
  pace: GoalPace | null;
  experience: GoalExperience;
  sex: GoalSex | null;
  ageYears: number | null;
  heightCm: number | null;
  startWeightKg: number | null;
  targetWeightKg: number | null;
  /** `preferences.trainDays.length` (0–7). */
  trainDaysPerWeek: number;
  units: GoalUnits;
};

export type WeightLog = { date: IsoDate; kg: number };
/** One planned lift day (`plan_days.workout_id`) and whether it was completed. */
export type SessionDay = { date: IsoDate; done: boolean };
/** One day with any meal logged; `onTarget` = kcal within ±10 % of that day's target. */
export type FuelDay = { date: IsoDate; onTarget: boolean };
/** AMI-165 `nextTarget` on the user's highest-sets ranked lift, pre-shaped by the caller. */
export type StrengthNext = { label: string; detail: string | null; sessions: number; perWeek: number };

export type GoalInput = {
  profile: GoalProfileInput;
  startDate: IsoDate;
  /** User-local today. The engine never reads the wall clock. */
  today: IsoDate;
  logs?: readonly WeightLog[];
  sessions?: readonly SessionDay[];
  fuelDays?: readonly FuelDay[];
  checkInDates?: readonly IsoDate[];
  photoDates?: readonly IsoDate[];
  strength?: { stepUps28d: number; next: StrengthNext | null } | null;
  /** Stored `goal_plans.planned_line_json`; recomputed from the profile when absent. */
  plannedLine?: readonly number[] | null;
};

/** kg/week at the current weight. */
export type GoalRates = {
  pace: number;
  plan: number;
  expected: number;
  optimistic: number;
  conservative: number;
  whatIf: number;
};

export type GoalBand = {
  optimistic: IsoDate | null;
  expected: IsoDate | null;
  conservative: IsoDate | null;
  weeksExpected: number | null;
};

export type GoalMilestone = {
  id: string;
  kind: GoalMilestoneKind;
  label: string;
  detail: string | null;
  date: IsoDate | null;
  window: [IsoDate, IsoDate] | null;
  done: boolean;
};

export type AdherenceCounts = {
  training: { done: number; planned: number };
  fuel: { onTarget: number; logged: number } | null;
  checkIn: { days: number; of: number };
};

export type GoalAdherence = {
  /** A ∈ [0,1]; the prior 0.625 when fewer than 7 days of plan. */
  score: number;
  /** M(A) = 0.6 + 0.4·A. */
  multiplier: number;
  prior: boolean;
  training: number | null;
  fuel: number | null;
  checkIn: number | null;
  counts: AdherenceCounts;
  /** Component with the largest weighted gap (whatIf lever). */
  lever: GoalLever;
};

export type TrendPoint = { date: IsoDate; kg: number; trendKg: number };

export type GoalTrend = {
  points: TrendPoint[];
  trendKg: number | null;
  /** Signed least-squares slope of the trend over the last 28 days, kg/week. */
  slopeKgWk: number | null;
  /** Same over the last 21 days (reversal check). */
  slope21KgWk: number | null;
  spanDays: number;
  valid: boolean;
};

export type GoalChart = {
  start: IsoDate;
  unit: "kg" | "lb";
  targetKg: number | null;
  planned: number[];
  optimistic: number[];
  conservative: number[];
  actual: TrendPoint[];
  todayIndex: number;
};

export type GoalProjection = {
  engineVersion: string;
  goalType: GoalType;
  direction: GoalDirection;
  mode: GoalMode;
  pace: GoalPace;
  startDate: IsoDate;
  startWeightKg: number | null;
  targetWeightKg: number | null;
  targetEffectiveKg: number | null;
  currentKg: number | null;
  paceRatePct: number;
  paceRateKg: number;
  kcalHint: number | null;
  rates: GoalRates;
  band: GoalBand;
  whatIf: { eta: IsoDate; lever: GoalLever } | null;
  status: GoalStatus;
  trendKg: number | null;
  observedKgWk: number | null;
  toGoKg: number | null;
  adherence: GoalAdherence;
  milestones: GoalMilestone[];
  flags: GoalFlag[];
  plannedLine: number[];
  chart: GoalChart | null;
};
