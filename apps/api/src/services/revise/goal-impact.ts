/**
 * Plan-chat goal impact (AMI-181, arch §6). Deterministic and server-side: the AI never
 * computes dates. Persistent edits re-run the engine's energy model (activity factor,
 * kcal per kg/week) on the before/after inputs and report the ETA shift; one-day meal edits
 * compare the day's planned kcal to its target (±10 %). No ETA → null.
 */
import { goalEngine, type GoalContext, type GoalImpact, type ReviseItem } from "@mirra/contracts";

import { monthDay } from "../../lib/goal";
import type { ReviseState } from "./context";

/** Rough burn of a moderate lifting session, kcal per minute (session length edits). */
export const SESSION_KCAL_PER_MIN = 5;
/** Shifts under this many days read as "keeps" (the band is far wider than that). */
export const SAME_ETA_DAYS = 4;
/** Below this rate the estimate stalls: no honest date to give. */
const MIN_RATE_KG_WK = 0.05;
const DAY_TOLERANCE = 0.1;

export type GoalImpactChange = {
  /** Lift days per week before → after (persistent). */
  sessionsPerWeek?: { before: number; after: number };
  /** Minutes per session before → after (persistent). */
  sessionMinutes?: { before: number; after: number };
  /** Lift days per week right now (for the session-length burn). */
  liftDaysPerWeek?: number;
  /** Persistent daily intake change, kcal/day (+ = more food). */
  kcalPerDay?: number;
  /** Persistent edit with no energy effect (meals per day, prefs, exercise swaps, day moves). */
  persistent?: boolean;
  /** One-day meal edit: the day's target and planned kcal before → after. */
  day?: { targetKcal: number; beforeKcal: number; afterKcal: number };
};

const isOnPace = (g: GoalContext) => g.status === "on_track" || g.status === "ahead";

const span = (days: number): string => {
  const d = Math.abs(days);
  if (d < 7) return `~${d} days`;
  const w = Math.round(d / 7);
  return `~${w} week${w === 1 ? "" : "s"}`;
};

/** Implied maintenance from the engine's kcal hint (cut: hint + planned deficit). */
const tdeeOf = (g: GoalContext): number | null =>
  g.kcalHint === null ? null : g.direction === "down" ? g.kcalHint + g.paceRateKg * goalEngine.KCAL_PER_KG_WEEK : g.kcalHint;

/**
 * ETA shift in days for the persistent part of `c`. `undefined` = no persistent change,
 * `null` = the change stalls the estimate.
 */
export const persistentEtaDelta = (g: GoalContext, c: GoalImpactChange): number | null | undefined => {
  if (!c.sessionsPerWeek && !c.sessionMinutes && !c.kcalPerDay && !c.persistent) return undefined;
  const nowKg = g.trendKg ?? g.startKg;
  if (g.direction === "hold" || g.targetKg === null || nowKg === null || !g.weeksLeft || g.weeksLeft <= 0) return 0;
  const toGo = Math.abs(g.targetKg - nowKg);
  if (toGo <= 0) return 0;
  const rate0 = toGo / g.weeksLeft;

  // + = more energy in than before (smaller deficit / bigger surplus), kcal/day.
  let surplus = c.kcalPerDay ?? 0;
  // Training burn only moves a cut; on a gain more training is not "slower muscle".
  if (g.direction === "down") {
    const tdee = tdeeOf(g);
    if (c.sessionsPerWeek && tdee !== null) {
      const { before, after } = c.sessionsPerWeek;
      surplus -= tdee * (goalEngine.activityFactor(after) / goalEngine.activityFactor(before) - 1);
    }
    if (c.sessionMinutes) {
      const days = c.sessionsPerWeek?.after ?? c.liftDaysPerWeek ?? 3;
      surplus -= ((c.sessionMinutes.after - c.sessionMinutes.before) * SESSION_KCAL_PER_MIN * days) / 7;
    }
  }
  const dRate = surplus / goalEngine.KCAL_PER_KG_WEEK;
  const rate1 = g.direction === "down" ? rate0 - dRate : rate0 + dRate;
  if (rate1 < MIN_RATE_KG_WK) return null;
  return Math.round((toGo / rate1 - g.weeksLeft) * 7);
};

const dayOffTarget = (d: GoalImpactChange["day"]): boolean =>
  !!d && d.targetKcal > 0 && Math.abs(d.afterKcal - d.targetKcal) > d.targetKcal * DAY_TOLERANCE;

/** The §6 line for a proposal. Null when the user has no ETA (no goal, no target, horizon). */
export const computeGoalImpact = (g: GoalContext | null | undefined, c: GoalImpactChange): GoalImpact | null => {
  if (!g || !g.etaExpected || g.mode !== "eta") return null;
  const eta = monthDay(g.etaExpected);
  const delta = persistentEtaDelta(g, c);
  if (delta === null) {
    return { line: `This would stall your estimate. Around ${eta} holds on your current plan.`, etaDeltaDays: null };
  }
  if (delta !== undefined && Math.abs(delta) >= SAME_ETA_DAYS) {
    const next = monthDay(goalEngine.addDays(g.etaExpected, delta));
    const line = delta > 0
      ? `Pushes your estimate ${span(delta)} later, to around ${next}`
      : `Brings your estimate ${span(delta)} earlier, to around ${next}`;
    return { line, etaDeltaDays: delta };
  }
  if (c.day && dayOffTarget(c.day)) {
    const n = Math.round(c.day.afterKcal - c.day.beforeKcal);
    const kcal = n >= 0 ? `+${n}` : `-${Math.abs(n)}`;
    return { line: `${kcal} kcal today. Around ${eta} holds if the rest of the week is on target.`, etaDeltaDays: delta ?? 0 };
  }
  const line = isOnPace(g) ? `Keeps you on track for around ${eta}` : `Keeps your estimate at around ${eta}`;
  return { line, etaDeltaDays: delta ?? 0 };
};

/** kcal change of one meal row (after minus before). */
const mealKcal = (i: ReviseItem): number | null => {
  if (i.kind === "meal_swap") return i.delta.kcal;
  if (i.kind === "meal_add") return i.after.kcal;
  if (i.kind === "meal_remove") return -i.before.kcal;
  return null;
};

/** Proposal rows → engine change. Schedule moves are swaps, so the weekly lift count holds. */
export const goalImpactChangeOf = (state: ReviseState, items: readonly ReviseItem[]): GoalImpactChange => {
  const change: GoalImpactChange = {
    liftDaysPerWeek: state.plan.days.filter((d) => d.workoutId).length,
  };
  let dayDelta: number | null = null;
  for (const i of items) {
    const k = mealKcal(i);
    if (k !== null) dayDelta = (dayDelta ?? 0) + k;
    else if (i.kind === "session_minutes") change.sessionMinutes = { before: i.before, after: i.after };
    else change.persistent = true;
  }
  if (dayDelta !== null) {
    const planned = (state.mealPlan?.meals ?? []).reduce((s, m) => s + m.kcal, 0);
    const beforeKcal = planned > 0 ? planned : state.targets.kcal;
    change.day = { targetKcal: state.targets.kcal, beforeKcal, afterKcal: beforeKcal + dayDelta };
  }
  return change;
};

/** Response field: null with no rows or no goal ETA. */
export const goalImpactFor = (state: ReviseState, items: readonly ReviseItem[]): GoalImpact | null =>
  items.length === 0 ? null : computeGoalImpact(state.goal, goalImpactChangeOf(state, items));
