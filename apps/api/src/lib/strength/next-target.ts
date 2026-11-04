/**
 * "Next division" as a concrete set (arch §6.4, research §2.5). Pure.
 */
import type { ExerciseScoring, NextTarget, StrengthUnits } from "@mirra/contracts";

import { MAX_BW_REPS } from "./e1rm";
import { MAX_PCT, valueAtPct, type Anchors } from "./percentile";
import { EWMA_ALPHA, FLOOR_SHARE } from "./sustain";

export const KG_PER_LB = 0.45359237;
export const DEFAULT_REPS = 8;
/** Max sessions we plan ahead; past this the UI shows only the progress bar. */
export const MAX_SESSIONS = 3;
/** Session pct may overshoot the target by at most this much. */
export const OVERSHOOT = 10;
/** Reps-only bodyweight targets stop here (arch §6.4). */
export const MAX_TARGET_REPS = 15;

export type TargetLift = {
  id: string;
  name: string;
  scoring: ExerciseScoring;
  bwFactor?: number;
  anchors: Anchors;
};

export type TargetInput = {
  lift: TargetLift;
  /** Current EWMA (s₀) and best session pct of this exercise. */
  sustainedPct: number;
  bestPct: number;
  /** Exercise pct the user must reach. */
  targetPct: number;
  toLabel: string;
  bw: number | null;
  units: StrengthUnits;
  /** Plan prescription ("8-12" → 8). */
  planReps: string | null;
};

/** Low end of a rep prescription, else 8. */
export const repsFromPlan = (planReps: string | null): number => {
  const m = planReps?.match(/\d+/);
  const n = m ? Number(m[0]) : NaN;
  return Number.isFinite(n) && n >= 1 && n <= MAX_TARGET_REPS ? n : DEFAULT_REPS;
};

/** Smallest n ∈ 1..3 and session pct p ≤ target + 10 so that after n sessions at p the pct reaches target. */
export const sessionsToTarget = (
  sustainedPct: number,
  bestPct: number,
  targetPct: number,
): { sessions: number; sessionPct: number } | null => {
  if (Math.max(sustainedPct, FLOOR_SHARE * bestPct) >= targetPct) return null;
  const floorP = targetPct / FLOOR_SHARE;
  for (let n = 1; n <= MAX_SESSIONS; n += 1) {
    const keep = (1 - EWMA_ALPHA) ** n;
    const ewmaP = (targetPct - sustainedPct * keep) / (1 - keep);
    const p = Math.min(ewmaP, floorP);
    if (p <= targetPct + OVERSHOOT && p <= MAX_PCT) return { sessions: n, sessionPct: p };
  }
  return null;
};

const ceilTo = (v: number, step: number): number => Math.ceil(v / step - 1e-9) * step;
const fmt = (n: number): string => String(Math.round(n * 10) / 10);

/** Round a kg load UP to the gym increment: 2.5 kg, or 5 lb for imperial. */
export const roundLoad = (kg: number, units: StrengthUnits): { kg: number; text: string } => {
  if (units === "imperial") {
    const lb = ceilTo(kg / KG_PER_LB, 5);
    return { kg: Math.round(lb * KG_PER_LB * 100) / 100, text: `${fmt(lb)} lb` };
  }
  const k = ceilTo(kg, 2.5);
  return { kg: k, text: `${fmt(k)} kg` };
};

export const nextTarget = (input: TargetInput): NextTarget | null => {
  const { lift, units } = input;
  const plan = sessionsToTarget(input.sustainedPct, input.bestPct, input.targetPct);
  if (!plan) return null;
  const value = valueAtPct(plan.sessionPct, lift.anchors);
  const base = { toLabel: input.toLabel, exerciseId: lift.id, exerciseName: lift.name, sessions: plan.sessions };

  if (lift.scoring === "time") {
    const secs = Math.max(1, Math.ceil(value));
    return { ...base, weightKg: null, reps: secs, display: `${secs} s hold` };
  }
  if (lift.scoring === "reps") {
    const reps = Math.max(1, Math.ceil(value));
    return { ...base, weightKg: null, reps, display: `${reps} reps` };
  }

  const reps = repsFromPlan(input.planReps);
  const load = value / (1 + reps / 30);
  if (lift.scoring === "load") {
    const r = roundLoad(load, units);
    return { ...base, weightKg: r.kg, reps, display: `${r.text} × ${reps}` };
  }

  // Bodyweight: added load at the plan reps, else reps at bodyweight.
  if (input.bw == null || input.bw <= 0) return null;
  const body = input.bw * (lift.bwFactor ?? 1);
  const added = load - body;
  if (added > 0) {
    const r = roundLoad(added, units);
    return { ...base, weightKg: r.kg, reps, display: `+${r.text} × ${reps}` };
  }
  const bwReps = Math.max(1, Math.ceil(30 * (value / body - 1) - 1e-9));
  if (bwReps > Math.min(MAX_TARGET_REPS, MAX_BW_REPS)) return null;
  return { ...base, weightKg: null, reps: bwReps, display: `BW × ${bwReps}` };
};

/**
 * Exercise pct a muscle's contributor needs so the muscle reaches `targetMusclePct`
 * (arch §6.4 step 1): `ex_pct + (target − muscle_pct) × Σw / w_i`, capped at 99.
 */
export const contributorTargetPct = (
  exercisePct: number,
  musclePct: number,
  targetMusclePct: number,
  totalW: number,
  w: number,
): number => (w > 0 ? Math.min(99, exercisePct + ((targetMusclePct - musclePct) * totalW) / w) : 99);
