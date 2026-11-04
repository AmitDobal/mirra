/**
 * Exercise → muscle → group → overall (research §2.4 steps 4-5, arch §6.2). Pure.
 */
import {
  MUSCLE_GROUP_IDS,
  MUSCLE_GROUP_OF,
  MUSCLE_IDS,
  type MuscleGroupId,
  type MuscleId,
} from "@mirra/contracts";

/** Involvement below this share never moves a muscle's tier. */
export const MIN_INVOLVEMENT = 25;
export const OVERALL_RANKED_NEEDED = 8;
export const OVERALL_GROUPS_NEEDED = 5;

export type ExerciseInput = {
  exerciseId: string;
  muscles: readonly { id: MuscleId; pct: number }[];
  sets90d: number;
  /** Exercise pct; null = unranked lift (no standard or no score yet). */
  pct: number | null;
};

export type Contributor = { exerciseId: string; involvementPct: number; sets90d: number; w: number; pct: number };
export type MuscleScore = { pct: number; contributors: Contributor[] };

/**
 * `w = involvement × sets_last_90d`; muscle pct = Σw·pct / Σw over ranked lifts with
 * involvement ≥ 25%. When every contributor is stale (0 sets in 90 days) the weight
 * falls back to involvement alone, so rest never unranks a muscle.
 */
export const muscleScores = (inputs: readonly ExerciseInput[]): Map<MuscleId, MuscleScore> => {
  const out = new Map<MuscleId, MuscleScore>();
  for (const muscle of MUSCLE_IDS) {
    const rows: Contributor[] = [];
    for (const ex of inputs) {
      if (ex.pct == null) continue;
      const inv = ex.muscles.find((m) => m.id === muscle)?.pct ?? 0;
      if (inv < MIN_INVOLVEMENT) continue;
      rows.push({ exerciseId: ex.exerciseId, involvementPct: inv, sets90d: ex.sets90d, w: inv * ex.sets90d, pct: ex.pct });
    }
    if (!rows.length) continue;
    if (rows.every((r) => r.w === 0)) for (const r of rows) r.w = r.involvementPct;
    const used = rows.filter((r) => r.w > 0);
    const total = used.reduce((s, r) => s + r.w, 0);
    const pct = used.reduce((s, r) => s + r.w * r.pct, 0) / total;
    out.set(muscle, { pct, contributors: used.sort((a, b) => b.w - a.w) });
  }
  return out;
};

/** Group pct = mean of its ranked muscles. Groups with no ranked muscle are absent. */
export const groupScores = (muscles: ReadonlyMap<MuscleId, { pct: number }>): Map<MuscleGroupId, number> => {
  const acc = new Map<MuscleGroupId, number[]>();
  for (const [id, m] of muscles) {
    const g = MUSCLE_GROUP_OF[id];
    acc.set(g, [...(acc.get(g) ?? []), m.pct]);
  }
  const out = new Map<MuscleGroupId, number>();
  for (const g of MUSCLE_GROUP_IDS) {
    const xs = acc.get(g);
    if (xs?.length) out.set(g, xs.reduce((s, v) => s + v, 0) / xs.length);
  }
  return out;
};

export type OverallResult = {
  pct: number | null;
  unlock: { ranked: number; rankedNeeded: number; groups: number; groupsNeeded: number };
};

/** `0.75 × mean(groups) + 0.25 × min(groups)`, unlocked at ≥8 ranked lifts over ≥5 groups. */
export const overallScore = (groups: ReadonlyMap<MuscleGroupId, number>, rankedExercises: number): OverallResult => {
  const xs = [...groups.values()];
  const unlock = {
    ranked: rankedExercises,
    rankedNeeded: OVERALL_RANKED_NEEDED,
    groups: xs.length,
    groupsNeeded: OVERALL_GROUPS_NEEDED,
  };
  if (rankedExercises < OVERALL_RANKED_NEEDED || xs.length < OVERALL_GROUPS_NEEDED) return { pct: null, unlock };
  const mean = xs.reduce((s, v) => s + v, 0) / xs.length;
  return { pct: 0.75 * mean + 0.25 * Math.min(...xs), unlock };
};
