/**
 * Exercise rows → muscles / groups / overall with display steps, and the promotions
 * between two snapshots (arch §6.3 steps 4-5). Pure.
 */
import type { MuscleGroupId, MuscleId, TierChange, TierScope } from "@mirra/contracts";

import { groupScores, muscleScores, overallScore, type Contributor, type OverallResult } from "./aggregate";
import { rankedLift, type ExerciseScoreRow } from "./session";
import { exercisePctOf } from "./sustain";
import { holdStep, standingOf } from "./tiers";

export type Scored = { pct: number; step: number };

export type StrengthSnapshot = {
  muscles: ReadonlyMap<MuscleId, Scored>;
  groups: ReadonlyMap<MuscleGroupId, Scored>;
  overall: Scored | null;
};

export type Rollup = {
  muscles: Map<MuscleId, Scored & { contributors: Contributor[] }>;
  groups: Map<MuscleGroupId, Scored>;
  overall: Scored | null;
  unlock: OverallResult["unlock"];
};

export const rollup = (
  scores: ReadonlyMap<string, ExerciseScoreRow>,
  sets90d: ReadonlyMap<string, number>,
  prev: StrengthSnapshot,
): Rollup => {
  const inputs = [...scores.values()].flatMap((row) => {
    const lift = rankedLift(row.exerciseId);
    if (!lift) return [];
    return [{ exerciseId: row.exerciseId, muscles: lift.entry.muscles, sets90d: sets90d.get(row.exerciseId) ?? 0, pct: exercisePctOf(row) }];
  });
  const muscles = new Map<MuscleId, Scored & { contributors: Contributor[] }>();
  for (const [id, m] of muscleScores(inputs)) {
    muscles.set(id, { pct: m.pct, step: holdStep(prev.muscles.get(id)?.step ?? null, m.pct), contributors: m.contributors });
  }
  const groups = new Map<MuscleGroupId, Scored>();
  for (const [id, pct] of groupScores(muscles)) {
    groups.set(id, { pct, step: holdStep(prev.groups.get(id)?.step ?? null, pct) });
  }
  const o = overallScore(new Map([...groups].map(([id, g]) => [id, g.pct])), inputs.length);
  const overall = o.pct == null ? null : { pct: o.pct, step: holdStep(prev.overall?.step ?? null, o.pct) };
  return { muscles, groups, overall, unlock: o.unlock };
};

const humanize = (id: string): string => {
  const s = id.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export type StepEvent = { scope: TierScope; refId: string; fromStep: number | null; toStep: number };

const SCOPE_ORDER: Record<TierScope, number> = { overall: 0, group: 1, muscle: 2, exercise: 3 };
export const MAX_TIER_CHANGES = 6;

type Pair = { scope: TierScope; refId: string; name: string; from: Scored | null; to: Scored };

/** Every display-step increase (first rank included) as events + wire changes (max 6, overall first). */
export const diffSteps = (
  prevExercises: ReadonlyMap<string, ExerciseScoreRow>,
  nextExercises: ReadonlyMap<string, ExerciseScoreRow>,
  prev: StrengthSnapshot,
  next: Rollup,
): { events: StepEvent[]; changes: TierChange[] } => {
  const pairs: Pair[] = [];
  const push = (scope: TierScope, refId: string, name: string, from: Scored | null, to: Scored | null) => {
    if (to && (!from || to.step > from.step)) pairs.push({ scope, refId, name, from, to });
  };
  const exScored = (r: ExerciseScoreRow | undefined): Scored | null =>
    r ? { pct: exercisePctOf(r), step: r.displayStep } : null;

  push("overall", "overall", "Overall", prev.overall, next.overall);
  for (const [id, g] of next.groups) push("group", id, humanize(id), prev.groups.get(id) ?? null, g);
  for (const [id, m] of next.muscles) push("muscle", id, humanize(id), prev.muscles.get(id) ?? null, m);
  for (const [id, row] of nextExercises) {
    push("exercise", id, rankedLift(id)?.entry.name ?? id, exScored(prevExercises.get(id)), exScored(row));
  }

  const events = pairs.map((p) => ({ scope: p.scope, refId: p.refId, fromStep: p.from?.step ?? null, toStep: p.to.step }));
  const changes = [...pairs]
    .sort((a, b) => SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope] || b.to.step - a.to.step)
    .slice(0, MAX_TIER_CHANGES)
    .map((p) => ({
      scope: p.scope,
      refId: p.refId,
      name: p.name,
      from: p.from ? standingOf(p.from.step, p.from.pct) : null,
      to: standingOf(p.to.step, p.to.pct),
    }));
  return { events, changes };
};

export const muscleName = humanize;
