/**
 * Goal projection engine (AMI-178). Pure TS, runs in React Native and Workers.
 * Arch: `docs/03-engineering/goal-timeline.md` §2–§3.
 */
export * from "./types";
export { addDays, dateAfterWeeks, dayNumber, diffDays, fromDayNumber, isIsoDate } from "./dates";
export {
  activityFactor,
  bmr,
  healthyMinKg,
  holdBandKg,
  kcalFloor,
  KCAL_PER_KG_WEEK,
  planPace,
  ratePct,
  rateBounds,
  resolveDirection,
  type PacePlan,
  type PacePlanInput,
} from "./rates";
export { simulate, sampleAt, MAX_WEEKS, HORIZON_WEEKS, type SimInput, type SimResult } from "./simulate";
export { computeTrend, isTrendReversed } from "./trend";
export { A_PRIOR, M_PRIOR, adherenceMultiplier, computeAdherence, type AdherenceInput } from "./adherence";
export { bandRates, trendWeight, OPTIMISTIC_SPREAD, CONSERVATIVE_SPREAD, type BandRates } from "./band";
export { resolveStatus, goalTolerance, type StatusInput } from "./status";
export { buildMilestones, MAX_MILESTONES, type MilestoneInput } from "./milestones";
export { displayWeight, formatDelta, formatWeight, formatWeightNumber, kgToLb, lbToKg } from "./units";
export { projectGoal } from "./project";
export { previewGoal, toGoalType, type GoalPreviewAnswers } from "./preview";
