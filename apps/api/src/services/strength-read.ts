/**
 * Read side of the strength engine: `GET /v1/strength`, `/muscles/:id`, `/exercises/:id`
 * (arch §6.5). Every query filters by `user_id`.
 */
import {
  MUSCLE_GROUP_IDS,
  MUSCLE_GROUP_OF,
  MUSCLE_IDS,
  type ExerciseStrengthResponse,
  type MuscleContributor,
  type MuscleId,
  type MuscleStrengthResponse,
  type NextTarget,
  type StrengthOverviewResponse,
} from "@mirra/contracts";
import { and, eq } from "drizzle-orm";

import { STANDARDS_VERSION } from "../data/strength-standards";
import type { AppDB } from "../db";
import { exerciseScores } from "../db/schema";
import { libraryEntry, normalize, TAG_PREFIX, withRoles } from "../lib/exercise-library";
import { notFound } from "../lib/errors";
import { MIN_INVOLVEMENT, OVERALL_GROUPS_NEEDED, OVERALL_RANKED_NEEDED } from "../lib/strength/aggregate";
import { nextTarget, contributorTargetPct } from "../lib/strength/next-target";
import { liftAnchors, rankedLift, type ExerciseScoreRow } from "../lib/strength/session";
import { exercisePctOf } from "../lib/strength/sustain";
import { label, MAX_STEP, standingOf, stepLowerPct } from "../lib/strength/tiers";
import { loadTagEntry, musclesForCanonicalIds } from "./exercise-resolve";
import {
  loadPlanReps,
  loadStrengthContext,
  selectExerciseScores,
  selectMuscleScores,
  selectSets90d,
  selectSummary,
  snapshotOf,
  toCountMap,
  toMuscleMap,
  toScoreRow,
  type StrengthContext,
} from "./strength-store";

const scoreStanding = (row: ExerciseScoreRow | undefined) =>
  row ? standingOf(row.displayStep, exercisePctOf(row)) : null;

const bestSetOf = (row: ExerciseScoreRow | undefined) =>
  row?.bestReps != null ? { weightKg: row.bestWeightKg, reps: row.bestReps } : null;

const titleCase = (s: string): string => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

const nameOf = (id: string): string =>
  libraryEntry(id)?.name ?? titleCase(id.startsWith(TAG_PREFIX) ? id.slice(TAG_PREFIX.length) : normalize(id));

/** Concrete set for one ranked exercise to reach `targetPct`. */
const targetFor = async (
  db: AppDB,
  userId: string,
  ctx: StrengthContext,
  row: ExerciseScoreRow,
  targetPct: number,
  toLabel: string,
): Promise<NextTarget | null> => {
  const lift = rankedLift(row.exerciseId);
  if (!lift || ctx.bw == null) return null;
  return nextTarget({
    lift: { id: lift.entry.id, name: lift.entry.name, scoring: lift.entry.scoring, bwFactor: lift.entry.bwFactor, anchors: liftAnchors(lift, ctx.sex, ctx.bw) },
    sustainedPct: row.sustainedPct,
    bestPct: row.bestPct,
    targetPct,
    toLabel,
    bw: ctx.bw,
    units: ctx.units,
    planReps: await loadPlanReps(db, userId, row.exerciseId),
  });
};

export const loadStrengthOverview = async (db: AppDB, userId: string): Promise<StrengthOverviewResponse> => {
  const ctx = await loadStrengthContext(db, userId);
  const [muscleRows, summaryRows] = await db.batch([selectMuscleScores(db, userId), selectSummary(db, userId)]);
  const summary = summaryRows[0];
  const snap = snapshotOf(muscleRows, summary);
  const standing = (s: { pct: number; step: number } | null | undefined) => (s ? standingOf(s.step, s.pct) : null);
  return {
    standardsVersion: STANDARDS_VERSION,
    units: ctx.units,
    needsBodyweight: ctx.bw == null,
    overall: standing(snap.overall),
    unlock: {
      ranked: summary?.rankedExercises ?? 0,
      rankedNeeded: OVERALL_RANKED_NEEDED,
      groups: summary?.groupsCovered ?? 0,
      groupsNeeded: OVERALL_GROUPS_NEEDED,
    },
    groups: MUSCLE_GROUP_IDS.map((id) => ({ id, standing: standing(snap.groups.get(id)) })),
    muscles: MUSCLE_IDS.map((id) => ({ id, standing: standing(snap.muscles.get(id)) })),
  };
};

export const loadMuscleStrength = async (db: AppDB, userId: string, muscleId: MuscleId): Promise<MuscleStrengthResponse> => {
  const ctx = await loadStrengthContext(db, userId);
  const [muscleRows, scoreRows, countRows] = await db.batch([
    selectMuscleScores(db, userId),
    selectExerciseScores(db, userId),
    selectSets90d(db, userId, Date.now()),
  ]);
  const muscle = toMuscleMap(muscleRows).get(muscleId);
  const scores = new Map(scoreRows.map((r) => [r.exerciseId, toScoreRow(r)]));
  const counts = toCountMap(countRows);
  const ids = [...new Set([...counts.keys(), ...scores.keys()])];
  const muscles = await musclesForCanonicalIds(db, ids);

  const contributors: MuscleContributor[] = ids
    .flatMap((id) => {
      const inv = muscles.get(id)?.find((m) => m.id === muscleId)?.pct ?? 0;
      if (inv < MIN_INVOLVEMENT) return [];
      const row = rankedLift(id) ? scores.get(id) : undefined;
      return [{ exerciseId: id, name: nameOf(id), involvementPct: inv, sets90d: counts.get(id) ?? 0, standing: scoreStanding(row), bestSet: bestSetOf(row) }];
    })
    .sort((a, b) => Number(b.standing != null) - Number(a.standing != null) || b.sets90d - a.sets90d || b.involvementPct - a.involvementPct);

  let next: NextTarget | null = null;
  if (muscle && muscle.step < MAX_STEP) {
    const totalW = muscle.contributors.reduce((s, c) => s + c.w, 0);
    const targetMuscle = stepLowerPct(muscle.step + 1);
    for (const c of muscle.contributors.slice(0, 3)) {
      const row = scores.get(c.exerciseId);
      if (!row) continue;
      const pct = contributorTargetPct(exercisePctOf(row), muscle.pct, targetMuscle, totalW, c.w);
      next = await targetFor(db, userId, ctx, row, pct, label(muscle.step + 1));
      if (next) break;
    }
  }

  return {
    id: muscleId,
    group: MUSCLE_GROUP_OF[muscleId],
    units: ctx.units,
    standing: muscle ? standingOf(muscle.step, muscle.pct) : null,
    next,
    contributors,
  };
};

export const loadExerciseStrength = async (db: AppDB, userId: string, exerciseId: string): Promise<ExerciseStrengthResponse> => {
  const ctx = await loadStrengthContext(db, userId);
  const entry = libraryEntry(exerciseId);
  if (!entry) {
    const tag = await loadTagEntry(db, exerciseId);
    if (!tag) throw notFound("Exercise not found");
    const tagMuscles = (await musclesForCanonicalIds(db, [exerciseId])).get(exerciseId) ?? [];
    return { exerciseId, name: nameOf(exerciseId), units: ctx.units, ranked: false, standing: null, next: null, bestSet: null, muscles: tagMuscles };
  }
  const [raw] = await db
    .select()
    .from(exerciseScores)
    .where(and(eq(exerciseScores.userId, userId), eq(exerciseScores.exerciseId, exerciseId)))
    .limit(1);
  const ranked = entry.standard != null;
  const row = ranked && raw ? toScoreRow(raw) : undefined;
  const next =
    row && row.displayStep < MAX_STEP
      ? await targetFor(db, userId, ctx, row, stepLowerPct(row.displayStep + 1), label(row.displayStep + 1))
      : null;
  return {
    exerciseId,
    name: entry.name,
    units: ctx.units,
    ranked,
    standing: scoreStanding(row),
    next,
    bestSet: bestSetOf(row),
    muscles: withRoles(entry.muscles),
  };
};
