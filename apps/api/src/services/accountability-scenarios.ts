import type { AccountabilityScenario } from "@mirra/contracts";

/** Pure inputs for scenario detection and call-out copy (no I/O). */
export type ScenarioFacts = {
  /** 0-23 for today; 24 once the day is over (past dates). */
  hourLocal: number;
  kcalTarget: number;
  kcalLogged: number;
  proteinGTarget: number;
  proteinGLogged: number;
  workoutTitle: string | null;
  workoutPlanned: boolean;
  workoutDone: boolean;
  checkInDone: boolean;
  checkInStatus: string | null;
  missedSessions7d: number;
  missedYesterday: boolean;
  streakDays: number;
  /** Streak that ended before a gap (only set when yesterday had no check-in). */
  priorStreak: number;
  checkedInYesterday: boolean;
};

export type ScenarioPick = {
  primary: AccountabilityScenario;
  secondary: AccountabilityScenario[];
};

/** First match wins; the rest become `secondary`. */
export const SCENARIO_PRIORITY: readonly AccountabilityScenario[] = [
  "LOW_READINESS",
  "OVER_KCAL",
  "MISSED_LIFT",
  "STREAK_BREAK",
  "UNDER_PROTEIN",
  "UNDER_EATING",
  "ON_TRACK",
];

const DAY_ENDED_HOUR = 24;
const LOW_READINESS_STATUSES = new Set(["low_sleep", "soreness", "travel"]);

/** Scenarios that call the user out (not praise / not rest advice). */
const HARSH = new Set<AccountabilityScenario>([
  "OVER_KCAL",
  "MISSED_LIFT",
  "STREAK_BREAK",
  "UNDER_PROTEIN",
  "UNDER_EATING",
]);

export const isHarshScenario = (s: AccountabilityScenario): boolean => HARSH.has(s);

/** Signed: logged - target (positive = over). */
export const signedDelta = (logged: number, target: number): number =>
  Math.round(logged - target);

/** Overshoot (kcal) tolerated before we call it OVER: max(50, 3% of target). */
export const kcalOverTolerance = (target: number): number =>
  Math.max(50, Math.round(target * 0.03));

export const isOverKcal = (f: ScenarioFacts): boolean =>
  signedDelta(f.kcalLogged, f.kcalTarget) > kcalOverTolerance(f.kcalTarget);

const dayEnded = (f: ScenarioFacts): boolean => f.hourLocal >= DAY_ENDED_HOUR;

const isUnderProtein = (f: ScenarioFacts): boolean => {
  const ratio = f.proteinGLogged / Math.max(1, f.proteinGTarget);
  return (f.hourLocal >= 15 && ratio < 0.7) || (dayEnded(f) && ratio < 0.85);
};

const isUnderEating = (f: ScenarioFacts): boolean => {
  const ratio = f.kcalLogged / Math.max(1, f.kcalTarget);
  return (f.hourLocal >= 16 && ratio < 0.5) || (dayEnded(f) && ratio < 0.7);
};

const isMissedLift = (f: ScenarioFacts): boolean =>
  (f.workoutPlanned && !f.workoutDone && f.hourLocal >= 19) || f.missedYesterday;

const isStreakBreak = (f: ScenarioFacts): boolean =>
  (!f.checkInDone && !f.checkedInYesterday && f.priorStreak >= 3) ||
  f.missedSessions7d >= 2;

/** All scenarios that fire, in priority order. ON_TRACK only when nothing else does. */
export const detectScenarios = (f: ScenarioFacts): AccountabilityScenario[] => {
  const fired: AccountabilityScenario[] = [];
  if (f.checkInStatus && LOW_READINESS_STATUSES.has(f.checkInStatus)) {
    fired.push("LOW_READINESS");
  }
  if (isOverKcal(f)) fired.push("OVER_KCAL");
  if (isMissedLift(f)) fired.push("MISSED_LIFT");
  if (isStreakBreak(f)) fired.push("STREAK_BREAK");
  if (isUnderProtein(f)) fired.push("UNDER_PROTEIN");
  if (isUnderEating(f)) fired.push("UNDER_EATING");
  return fired.length ? fired : ["ON_TRACK"];
};

/** Primary + up to 2 secondary scenarios (priority order). */
export const pickScenarios = (f: ScenarioFacts): ScenarioPick => {
  const [primary, ...rest] = detectScenarios(f);
  return { primary, secondary: rest.slice(0, 2) };
};

/** Fuel counts as a "win" only when inside the band: not over, near target, protein on pace. */
export const isFuelWin = (f: ScenarioFacts): boolean =>
  !isOverKcal(f) &&
  f.kcalLogged >= f.kcalTarget * 0.85 &&
  f.proteinGLogged >= f.proteinGTarget * 0.85;
