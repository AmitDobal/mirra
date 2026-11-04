/**
 * AMI-165 next division → engine `StrengthNext` (arch §3 strength milestone). Pure.
 * Lift = the user's highest-sets ranked lift (90 d) that still has a next step.
 */
import type { StrengthUnits } from "@mirra/contracts";

import { label, MAX_STEP, stepLowerPct } from "../strength/tiers";
import { nextTarget } from "../strength/next-target";
import type { StrengthSex } from "../strength/percentile";
import { liftAnchors, rankedLift, type ExerciseScoreRow } from "../strength/session";

export type StrengthNextOut = { label: string; detail: string | null; sessions: number; perWeek: number };

export const pickStrengthLift = (
  rows: readonly ExerciseScoreRow[],
  sets90d: ReadonlyMap<string, number>,
): ExerciseScoreRow | null => {
  const ranked = rows.filter((r) => rankedLift(r.exerciseId) !== null && r.displayStep < MAX_STEP);
  ranked.sort(
    (a, b) => (sets90d.get(b.exerciseId) ?? 0) - (sets90d.get(a.exerciseId) ?? 0) || b.sustainedPct - a.sustainedPct,
  );
  return ranked[0] ?? null;
};

export const strengthNextOf = (
  row: ExerciseScoreRow,
  ctx: { sex: StrengthSex; bw: number | null; units: StrengthUnits },
  plan: { reps: string | null; perWeek: number },
): StrengthNextOut | null => {
  const lift = rankedLift(row.exerciseId);
  if (!lift || ctx.bw == null || ctx.bw <= 0) return null;
  const t = nextTarget({
    lift: {
      id: lift.entry.id,
      name: lift.entry.name,
      scoring: lift.entry.scoring,
      bwFactor: lift.entry.bwFactor,
      anchors: liftAnchors(lift, ctx.sex, ctx.bw),
    },
    sustainedPct: row.sustainedPct,
    bestPct: row.bestPct,
    targetPct: stepLowerPct(row.displayStep + 1),
    toLabel: label(row.displayStep + 1),
    bw: ctx.bw,
    units: ctx.units,
    planReps: plan.reps,
  });
  if (!t) return null;
  return {
    label: `${t.exerciseName} ${t.toLabel}`,
    detail: `${t.display} for ${t.sessions} session${t.sessions === 1 ? "" : "s"}`,
    sessions: t.sessions,
    perWeek: Math.max(1, plan.perWeek),
  };
};
