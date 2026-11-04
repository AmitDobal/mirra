/**
 * Engine projection + plan row → `GoalResponse` (wire) and `GoalContext` (AI, §6). Pure.
 */
import {
  ENGINE_VERSION,
  goalEngine,
  type GoalContext,
  type GoalPlanSummary,
  type GoalProjection,
  type GoalResponse,
  type GoalTimelineStatus,
} from "@mirra/contracts";

type IsoDate = string;

export type PlanSummaryRow = {
  version: number;
  goalType: string;
  primaryGoal: string;
  pace: string | null;
  direction: string;
  mode: string;
  startDate: string;
  startWeightKg: number | null;
  targetWeightKg: number | null;
  targetEffectiveKg: number | null;
  paceRateKg: number;
  kcalHint: number | null;
  committedAt: number | null;
  etaExpected: string | null;
};

export const toPlanSummary = (p: PlanSummaryRow): GoalPlanSummary => ({
  version: p.version,
  goalType: p.goalType as GoalPlanSummary["goalType"],
  primaryGoal: p.primaryGoal as GoalPlanSummary["primaryGoal"],
  pace: (p.pace as GoalPlanSummary["pace"]) ?? null,
  direction: p.direction as GoalPlanSummary["direction"],
  mode: p.mode as GoalPlanSummary["mode"],
  startDate: p.startDate,
  startWeightKg: p.startWeightKg,
  targetWeightKg: p.targetWeightKg,
  targetEffectiveKg: p.targetEffectiveKg,
  paceRateKg: p.paceRateKg,
  kcalHint: p.kcalHint,
  committedAt: p.committedAt,
  originalEta: p.etaExpected,
});

export const toGoalResponse = (plan: PlanSummaryRow, g: GoalProjection): GoalResponse => ({
  engineVersion: g.engineVersion,
  plan: toPlanSummary(plan),
  status: g.status,
  band: g.band,
  whatIf: g.whatIf,
  trendKg: g.trendKg,
  toGoKg: g.toGoKg,
  adherence: {
    score: g.adherence.score,
    training: g.adherence.training,
    fuel: g.adherence.fuel,
    checkIn: g.adherence.checkIn,
  },
  milestones: g.milestones.slice(0, 8),
  flags: g.flags,
  chart: g.chart,
});

/** Body for a user with no onboarding (and so no plan). */
export const emptyGoalResponse = (): GoalResponse => ({
  engineVersion: ENGINE_VERSION,
  plan: null,
  status: "no_target",
  band: { optimistic: null, expected: null, conservative: null, weeksExpected: null },
  whatIf: null,
  trendKg: null,
  toGoKg: null,
  adherence: { score: goalEngine.A_PRIOR, training: null, fuel: null, checkIn: null },
  milestones: [],
  flags: [],
  chart: null,
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2027-02-18" → "Feb 18". */
export const monthDay = (d: IsoDate): string => `${MONTHS[Number(d.slice(5, 7)) - 1] ?? ""} ${Number(d.slice(8, 10))}`;

const STATUS_WORDS: Record<GoalTimelineStatus, string> = {
  on_track: "on track",
  ahead: "ahead",
  behind: "behind",
  calibrating: "calibrating",
  no_target: "no target",
};
const GOAL_WORDS: Record<string, string> = {
  fat_loss: "fat loss",
  muscle_gain: "muscle gain",
  recomp: "recomp",
  strength: "strength",
  general_fitness: "consistency",
};

const kg = (v: number) => String(Math.round(v * 10) / 10);
const ratio = (a: number, b: number) => `${Math.max(0, Math.round(a))}/${Math.max(0, Math.round(b))}`;

/** One-line goal summary for AI prompts (≤200 chars). */
export const goalLine = (plan: PlanSummaryRow, g: GoalProjection): string => {
  const parts: string[] = [];
  const target = g.targetEffectiveKg;
  if (g.mode === "eta" && g.startWeightKg !== null && target !== null) parts.push(`Goal ${kg(g.startWeightKg)}→${kg(target)} kg`);
  else parts.push(`Goal ${GOAL_WORDS[plan.goalType] ?? plan.goalType}`);
  if (g.trendKg !== null) parts.push(`trend ${kg(g.trendKg)}`);
  parts.push(STATUS_WORDS[g.status]);
  const { expected, optimistic, conservative } = g.band;
  if (expected) {
    const range = optimistic && conservative ? ` (${monthDay(optimistic)}–${monthDay(conservative)})` : "";
    parts.push(`around ${monthDay(expected)}${range}`);
  } else {
    const next = g.milestones.find((m) => !m.done);
    if (next) parts.push(`next: ${next.label}${next.date ? ` around ${monthDay(next.date)}` : ""}`);
  }
  return parts.join(" · ").slice(0, 200);
};

/** §6 `GoalContext` (≤600 chars; drops the milestone label and flags first if over). */
export const toGoalContext = (plan: PlanSummaryRow, g: GoalProjection, today: IsoDate): GoalContext => {
  const c = g.adherence.counts;
  const next = g.milestones.find((m) => !m.done) ?? null;
  const { expected, optimistic, conservative } = g.band;
  const ctx: GoalContext = {
    goalType: g.goalType,
    direction: g.direction,
    mode: g.mode,
    status: g.status,
    startKg: g.startWeightKg,
    targetKg: g.targetEffectiveKg,
    trendKg: g.trendKg,
    paceRateKg: g.paceRateKg,
    kcalHint: g.kcalHint,
    etaExpected: expected,
    etaRange: optimistic && conservative ? [optimistic, conservative] : null,
    weeksLeft: expected ? Math.max(0, Math.round((goalEngine.diffDays(expected, today) / 7) * 10) / 10) : null,
    adherence28d: {
      sessions: ratio(c.training.done, c.training.planned),
      checkIns: ratio(c.checkIn.days, c.checkIn.of),
      fuelOnTarget: c.fuel ? ratio(c.fuel.onTarget, c.fuel.logged) : null,
    },
    nextMilestone: next ? { label: next.label.slice(0, 60), date: next.date } : null,
    flags: g.flags,
    line: goalLine(plan, g),
  };
  if (JSON.stringify(ctx).length > 600) ctx.flags = [];
  if (JSON.stringify(ctx).length > 600) ctx.nextMilestone = null;
  return ctx;
};
