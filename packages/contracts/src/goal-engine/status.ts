/**
 * §3 status rules. Pure.
 */
import { holdBandKg } from "./rates";
import type { GoalAdherence, GoalDirection, GoalMode, GoalStatus, GoalType } from "./types";

export const CALIBRATING_DAYS = 14;
export const CALIBRATING_LOGS = 2;
export const TOLERANCE_MIN_KG = 0.5;
export const TOLERANCE_SHARE = 0.1;
const STRENGTH_BEHIND_TRAINING = 0.5;
const HABIT_ON_TRACK_TRAINING = 0.75;

export type StatusInput = {
  goalType: GoalType;
  mode: GoalMode;
  direction: GoalDirection;
  daysSinceStart: number;
  logCount: number;
  startKg: number | null;
  targetKg: number | null;
  currentKg: number | null;
  /** Planned line value at today. */
  plannedKg: number | null;
  reversed: boolean;
  adherence: GoalAdherence;
  stepUps28d: number;
};

const strengthStatus = (s: StatusInput): GoalStatus => {
  if (s.stepUps28d >= 1) return "on_track";
  if (!s.adherence.prior && s.adherence.training !== null && s.adherence.training < STRENGTH_BEHIND_TRAINING) return "behind";
  return "calibrating";
};

const habitStatus = (s: StatusInput): GoalStatus => {
  if (s.adherence.prior || s.adherence.training === null) return "calibrating";
  return s.adherence.training >= HABIT_ON_TRACK_TRAINING ? "on_track" : "behind";
};

export const goalTolerance = (startKg: number, targetKg: number) =>
  Math.max(TOLERANCE_MIN_KG, TOLERANCE_SHARE * Math.abs(targetKg - startKg));

export const resolveStatus = (s: StatusInput): GoalStatus => {
  if (s.mode !== "eta") {
    if (s.goalType === "strength") return strengthStatus(s);
    if (s.goalType === "general_fitness") return habitStatus(s);
  }
  if (s.mode === "horizon" || s.startKg === null) return "no_target";
  if (s.daysSinceStart < CALIBRATING_DAYS || s.logCount < CALIBRATING_LOGS || s.currentKg === null) return "calibrating";
  if (s.reversed) return "behind";

  if (s.mode === "milestones" || s.direction === "hold" || s.targetKg === null) {
    return Math.abs(s.currentKg - s.startKg) <= holdBandKg(s.startKg) ? "on_track" : "behind";
  }
  const planned = s.plannedKg ?? s.startKg;
  const tol = goalTolerance(s.startKg, s.targetKg);
  const gap = s.currentKg - planned;
  if (Math.abs(gap) <= tol) return "on_track";
  const ahead = s.direction === "down" ? gap < 0 : gap > 0;
  return ahead ? "ahead" : "behind";
};
