import { z } from "zod";

import {
  GOAL_DIRECTIONS,
  GOAL_FLAGS,
  GOAL_LEVERS,
  GOAL_MILESTONE_KINDS,
  GOAL_MODES,
  GOAL_STATUSES,
  GOAL_TYPES,
  isIsoDate,
  type GoalBand,
  type GoalChart,
  type GoalMilestone,
} from "./goal-engine";
import { PaceSchema, PrimaryGoalSchema } from "./onboarding";

/** Goal timeline contracts (AMI-178, arch `docs/03-engineering/goal-timeline.md` §5–§6). */

export const GoalIsoDateSchema = z.string().refine(isIsoDate, "Use a real YYYY-MM-DD date");
export const GoalTypeSchema = z.enum(GOAL_TYPES);
/**
 * Arch §5 calls this `GoalStatusSchema`; that name is taken by the Today goal
 * checklist (`today-actions.ts`), so the timeline status is `GoalTimelineStatus*`.
 */
export const GoalTimelineStatusSchema = z.enum(GOAL_STATUSES);
export const GoalFlagSchema = z.enum(GOAL_FLAGS);
export const GoalDirectionSchema = z.enum(GOAL_DIRECTIONS);
export const GoalModeSchema = z.enum(GOAL_MODES);
export const GoalLeverSchema = z.enum(GOAL_LEVERS);

export const GoalBandSchema = z.object({
  optimistic: GoalIsoDateSchema.nullable(),
  expected: GoalIsoDateSchema.nullable(),
  conservative: GoalIsoDateSchema.nullable(),
  weeksExpected: z.number().nullable(),
});

export const GoalMilestoneSchema = z.object({
  id: z.string(),
  kind: z.enum(GOAL_MILESTONE_KINDS),
  label: z.string(),
  detail: z.string().nullable(),
  date: GoalIsoDateSchema.nullable(),
  window: z.tuple([GoalIsoDateSchema, GoalIsoDateSchema]).nullable(),
  done: z.boolean(),
});

export const GoalChartSchema = z.object({
  start: GoalIsoDateSchema,
  unit: z.enum(["kg", "lb"]),
  targetKg: z.number().nullable(),
  /** Weekly kg points from `start`. */
  planned: z.array(z.number()),
  optimistic: z.array(z.number()),
  conservative: z.array(z.number()),
  actual: z.array(z.object({ date: GoalIsoDateSchema, kg: z.number(), trendKg: z.number() })).max(120),
  todayIndex: z.number(),
});

export const GoalPlanSummarySchema = z.object({
  version: z.number().int(),
  goalType: GoalTypeSchema,
  primaryGoal: PrimaryGoalSchema,
  pace: PaceSchema.nullable(),
  direction: GoalDirectionSchema,
  mode: GoalModeSchema,
  startDate: GoalIsoDateSchema,
  startWeightKg: z.number().nullable(),
  targetWeightKg: z.number().nullable(),
  targetEffectiveKg: z.number().nullable(),
  paceRateKg: z.number(),
  kcalHint: z.number().int().nullable(),
  committedAt: z.number().int().nullable(),
  originalEta: GoalIsoDateSchema.nullable(),
});

/** Raw 28-day counts behind the ratios (S44 "10 / 12" rows). Optional: older cached bodies lack it. */
export const GoalAdherenceCountsSchema = z.object({
  training: z.object({ done: z.number().int(), planned: z.number().int() }),
  fuel: z.object({ onTarget: z.number().int(), logged: z.number().int() }).nullable(),
  checkIn: z.object({ days: z.number().int(), of: z.number().int() }),
});

export const GoalAdherenceSummarySchema = z.object({
  score: z.number().min(0).max(1),
  training: z.number().nullable(),
  fuel: z.number().nullable(),
  checkIn: z.number().nullable(),
  counts: GoalAdherenceCountsSchema.optional(),
});

export const GoalResponseSchema = z.object({
  engineVersion: z.string(),
  plan: GoalPlanSummarySchema.nullable(),
  status: GoalTimelineStatusSchema,
  band: GoalBandSchema,
  whatIf: z.object({ eta: GoalIsoDateSchema, lever: GoalLeverSchema }).nullable(),
  trendKg: z.number().nullable(),
  toGoKg: z.number().nullable(),
  adherence: GoalAdherenceSummarySchema,
  milestones: GoalMilestoneSchema.array().max(8),
  flags: GoalFlagSchema.array(),
  chart: GoalChartSchema.nullable(),
});

/** §6 compact goal block for AI ports (≤600 chars serialized). */
export const GOAL_CONTEXT_MAX_CHARS = 600;
const Ratio = z.string().regex(/^\d+\/\d+$/);
export const GoalContextSchema = z
  .object({
    goalType: GoalTypeSchema,
    direction: GoalDirectionSchema,
    mode: GoalModeSchema,
    status: GoalTimelineStatusSchema,
    startKg: z.number().nullable(),
    targetKg: z.number().nullable(),
    trendKg: z.number().nullable(),
    paceRateKg: z.number(),
    kcalHint: z.number().int().nullable(),
    etaExpected: GoalIsoDateSchema.nullable(),
    etaRange: z.tuple([GoalIsoDateSchema, GoalIsoDateSchema]).nullable(),
    weeksLeft: z.number().nullable(),
    adherence28d: z.object({ sessions: Ratio, checkIns: Ratio, fuelOnTarget: Ratio.nullable() }),
    nextMilestone: z.object({ label: z.string(), date: GoalIsoDateSchema.nullable() }).nullable(),
    flags: GoalFlagSchema.array(),
    line: z.string().max(200),
  })
  .refine((c) => JSON.stringify(c).length <= GOAL_CONTEXT_MAX_CHARS, "GoalContext over 600 chars");

export type GoalBandDto = z.infer<typeof GoalBandSchema>;
export type GoalMilestoneDto = z.infer<typeof GoalMilestoneSchema>;
export type GoalChartDto = z.infer<typeof GoalChartSchema>;
export type GoalPlanSummary = z.infer<typeof GoalPlanSummarySchema>;
export type GoalResponse = z.infer<typeof GoalResponseSchema>;
export type GoalContext = z.infer<typeof GoalContextSchema>;

// Engine output must stay assignable to the wire shapes (compile-time guard).
type Assert<T extends true> = T;
type Extends<A, B> = [A] extends [B] ? true : false;
export type _GoalEngineWireCheck = [
  Assert<Extends<GoalBand, GoalBandDto>>,
  Assert<Extends<GoalMilestone, GoalMilestoneDto>>,
  Assert<Extends<GoalChart, GoalChartDto>>,
];

export {
  ENGINE_VERSION,
  GOAL_FLAGS,
  GOAL_STATUSES,
  GOAL_TYPES,
  displayWeight,
  formatWeight,
  formatWeightNumber,
  kgToLb,
  lbToKg,
  previewGoal,
  projectGoal,
  toGoalType,
} from "./goal-engine";
export type {
  GoalFlag,
  GoalInput,
  GoalPreviewAnswers,
  GoalProfileInput,
  GoalProjection,
  GoalStatus as GoalTimelineStatus,
  GoalType,
  IsoDate,
} from "./goal-engine";
export * as goalEngine from "./goal-engine";
