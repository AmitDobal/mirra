import type { CoachReviseChange } from "@mirra/contracts";
import { asc, eq } from "drizzle-orm";

import type { AppDB } from "../db";
import { workoutExercises, workouts } from "../db/schema";
import { newId } from "../lib/id";
import type { PlanReviseIntent } from "../ports/plan-reviser";
import { gearNeeded, pickSwap } from "./workout-swaps";

type Draft = {
  id: string | null;
  name: string;
  cue: string | null;
  targetSets: number;
  targetReps: string;
  restSec: number | null;
  swapGroup: string | null;
};

export type WorkoutReviseResult = {
  title: string;
  changes: CoachReviseChange[];
  warnings: string[];
};

type Opts = {
  workoutId: string;
  /** Equipment the user has AFTER this revision. */
  equipment: string[];
  intent: PlanReviseIntent;
  exerciseId?: string;
  dryRun: boolean;
};

const BENCH_RE = /bench press/i;
const PUSH_DAY_RE = /push|chest|upper/i;
const MIN_MOVES = 2;

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Bench press variant the user can actually do, or null. */
const benchName = (has: (g: string) => boolean): string | null => {
  if (has("barbell") && has("bench")) return "Bench press";
  if (has("dumbbells")) return "Dumbbell bench press";
  return null;
};

/**
 * Rewrite one workout's exercises in place: swap moves that need unavailable gear,
 * favour bench press on push days, and trim to a shorter session. Plan/workout rows
 * stay; only exercises (and duration) change.
 */
export const reviseWorkout = async (db: AppDB, opts: Opts): Promise<WorkoutReviseResult | null> => {
  const [workout] = await db.select().from(workouts).where(eq(workouts.id, opts.workoutId)).limit(1);
  if (!workout) return null;
  const rows = await db
    .select()
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workout.id))
    .orderBy(asc(workoutExercises.sortOrder));

  const original = rows.map((r) => r.id);
  let list: Draft[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    cue: r.cue,
    targetSets: r.targetSets,
    targetReps: r.targetReps,
    restSec: r.restSec,
    swapGroup: r.swapGroup,
  }));
  const changes: CoachReviseChange[] = [];
  const warnings: string[] = [];
  const has = (gear: string) => gear === "bodyweight" || opts.equipment.includes(gear);

  // 1. Swap moves that need gear the user no longer has.
  const stuck: string[] = [];
  list = list.flatMap((ex) => {
    if (opts.exerciseId && ex.id !== opts.exerciseId) return [ex];
    const need = gearNeeded(ex.name);
    if (!need || has(need)) return [ex];
    const next = pickSwap(ex.name, need, has);
    if (!next) {
      stuck.push(ex.name);
      return [ex];
    }
    const dup = list.some((o) => o !== ex && same(o.name, next));
    if (dup && list.length > MIN_MOVES) {
      changes.push({ kind: "workout_remove", summary: `Dropped ${ex.name} (needs ${need}; ${next} already in session)` });
      return [];
    }
    changes.push({ kind: "workout_swap", summary: `${ex.name} → ${next}` });
    return [{ ...ex, name: next, cue: null }];
  });
  if (stuck.length > 0) warnings.push(`No substitute found for ${stuck.join(", ")}`);

  // 2. Prefer bench press on push days.
  if (opts.intent.preferBench) {
    const pushDay = PUSH_DAY_RE.test(`${workout.title} ${workout.focus ?? ""}`);
    const bench = benchName(has);
    if (!pushDay) warnings.push("Bench press saved as a preference; today isn't a push day");
    else if (!bench) warnings.push("Bench press needs dumbbells or a barbell + bench");
    else if (!list.some((e) => BENCH_RE.test(e.name))) {
      const target = list.findIndex((e) => e.swapGroup === "push" || /push-up|chest|fly/i.test(e.name));
      const bump: Draft = { id: null, name: bench, cue: "Retract shoulder blades", targetSets: 3, targetReps: "6-10", restSec: 120, swapGroup: "push" };
      if (target >= 0) {
        changes.push({ kind: "workout_swap", summary: `${list[target]!.name} → ${bench}` });
        list[target] = { ...list[target]!, name: bench, cue: bump.cue, targetReps: bump.targetReps, restSec: bump.restSec };
      } else {
        changes.push({ kind: "workout_add", summary: `Added ${bench} to the top of the session` });
        list = [bump, ...list];
      }
    }
  }

  // 3. Shorter session: cap duration, drop tail moves proportionally.
  let durationMin = workout.durationMin;
  let calorieEst = workout.calorieEst;
  const cap = opts.intent.shortenMin;
  if (cap != null && cap < durationMin) {
    const keep = Math.min(list.length, Math.max(MIN_MOVES, Math.round((list.length * cap) / durationMin)));
    const dropped = list.length - keep;
    list = list.slice(0, keep);
    if (calorieEst != null) calorieEst = Math.round((calorieEst * cap) / durationMin);
    changes.push({
      kind: "workout_shorten",
      summary: `Session ${durationMin} → ${cap} min${dropped > 0 ? `, dropped ${dropped} move${dropped > 1 ? "s" : ""}` : ""}`,
    });
    durationMin = cap;
  } else if (cap != null) {
    warnings.push(`Session is already ${durationMin} min`);
  }

  if (!opts.dryRun && changes.length > 0) {
    const keptIds = new Set(list.map((e) => e.id).filter((id): id is string => id != null));
    for (const id of original.filter((id) => !keptIds.has(id))) {
      await db.delete(workoutExercises).where(eq(workoutExercises.id, id));
    }
    for (const [i, ex] of list.entries()) {
      const values = {
        name: ex.name,
        cue: ex.cue,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        restSec: ex.restSec,
        swapGroup: ex.swapGroup,
        sortOrder: i,
      };
      if (ex.id) await db.update(workoutExercises).set(values).where(eq(workoutExercises.id, ex.id));
      else await db.insert(workoutExercises).values({ id: newId(), workoutId: workout.id, ...values });
    }
    await db.update(workouts).set({ durationMin, calorieEst }).where(eq(workouts.id, workout.id));
  }
  return { title: workout.title, changes, warnings };
};
