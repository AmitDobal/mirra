import type { PlanSummary } from "@mirra/contracts";
import { and, desc, eq } from "drizzle-orm";

import type { AppDB } from "../db";
import { planDays, plans, workoutExercises, workouts } from "../db/schema";
import type { MirraEnv } from "../env";
import { getExerciseTagger } from "../lib/exercise-tagger";
import { newId } from "../lib/id";
import type { PlanGenerateResult } from "../ports/plan-generator";
import { resolveExerciseNames } from "./exercise-resolve";

type PersistOpts = {
  db: AppDB;
  userId: string;
  weekStart: string;
  source: string;
  generated: PlanGenerateResult;
  parentPlanId?: string | null;
  /** Picks the ExerciseTagger. Omitted → heuristic tagger (library + cache still apply). */
  env?: MirraEnv;
};

/** name → canonical id for every plan exercise. One tagger call per plan; never fails the write. */
const canonicalIdsFor = async (
  db: AppDB,
  env: MirraEnv | undefined,
  generated: PlanGenerateResult,
): Promise<Map<string, string>> => {
  const names = generated.workouts.flatMap((w) => w.exercises.map((e) => e.name.trim()));
  try {
    const { byName } = await resolveExerciseNames({ db, tagger: getExerciseTagger(env, db), names });
    return new Map([...byName].map(([name, r]) => [name, r.canonicalId]));
  } catch (err) {
    console.warn("[persist-plan] exercise resolve failed", err instanceof Error ? err.message : String(err));
    return new Map();
  }
};

/** Insert ready plan + days/workouts/exercises; supersede prior ready plans. */
export const persistGeneratedPlan = async ({
  db,
  userId,
  weekStart,
  source,
  generated,
  parentPlanId = null,
  env,
}: PersistOpts): Promise<{ planId: string; version: number }> => {
  const now = new Date();
  const canonicalIds = await canonicalIdsFor(db, env, generated);
  const [latest] = await db
    .select({ version: plans.version })
    .from(plans)
    .where(eq(plans.userId, userId))
    .orderBy(desc(plans.version))
    .limit(1);
  const version = (latest?.version ?? 0) + 1;

  await db
    .update(plans)
    .set({ status: "superseded" })
    .where(and(eq(plans.userId, userId), eq(plans.status, "ready")));

  const planId = newId();
  const summary: PlanSummary = generated.summary;
  await db.insert(plans).values({
    id: planId,
    userId,
    version,
    status: "ready",
    weekStart,
    summaryJson: JSON.stringify(summary),
    source,
    parentPlanId,
    createdAt: now,
  });

  const workoutIds: string[] = [];
  for (let i = 0; i < generated.workouts.length; i++) {
    const w = generated.workouts[i]!;
    const workoutId = newId();
    workoutIds.push(workoutId);
    await db.insert(workouts).values({
      id: workoutId,
      planId,
      title: w.title,
      durationMin: w.durationMin,
      focus: w.focus ?? null,
      calorieEst: w.calorieEst ?? null,
      sortOrder: i,
    });
    for (let j = 0; j < w.exercises.length; j++) {
      const ex = w.exercises[j]!;
      await db.insert(workoutExercises).values({
        id: newId(),
        workoutId,
        name: ex.name,
        cue: ex.cue ?? null,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        restSec: ex.restSec ?? null,
        sortOrder: j,
        swapGroup: ex.swapGroup ?? null,
        canonicalId: canonicalIds.get(ex.name.trim()) ?? null,
      });
    }
  }

  for (const day of generated.days) {
    const workoutId =
      day.workoutIndex != null ? (workoutIds[day.workoutIndex] ?? null) : null;
    await db.insert(planDays).values({
      id: newId(),
      planId,
      dayIndex: day.dayIndex,
      date: day.date,
      kind: day.kind,
      label: day.label ?? null,
      workoutId,
    });
  }

  return { planId, version };
};
