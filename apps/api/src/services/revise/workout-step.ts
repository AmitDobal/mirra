import type { CoachReviseChange, ExerciseSnap, ReviseItem } from "@mirra/contracts";

import type { AppDB } from "../../db";
import type { PlanReviseIntent } from "../../ports/plan-reviser";
import { reviseWorkout } from "../workout-revise";
import type { PlanWorkout, ReviseState } from "./context";
import { exerciseReason } from "./tags";

/**
 * AMI-163 bridge: wraps today's `reviseWorkout(dryRun)` and maps its rows to typed
 * exercise_swap / exercise_add / exercise_remove / session_minutes items with sets x reps.
 * Apply re-runs it non-dry. AMI-166 replaces this file (library match, named swaps).
 */

export type WorkoutDraft = {
  workoutId: string;
  equipment: string[];
  intent: PlanReviseIntent;
  exerciseId?: string;
};

export type WorkoutStepResult = {
  items: ReviseItem[];
  warnings: string[];
  draft: WorkoutDraft | null;
};

const BENCH = /bench press/i;
const MIN_MOVES = 2;
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const GEAR_TAGS: [RegExp, string][] = [
  [/dumbbell/i, "Dumbbells"],
  [/band/i, "Bands"],
  [/cable/i, "Cables"],
  [/machine|leg press|lat pulldown/i, "Machines"],
  [/barbell|bench press|deadlift|squat/i, "Barbell"],
];
/** Equipment pill for the after-exercise ("Dumbbells"). */
export const gearTag = (name: string): string => GEAR_TAGS.find(([re]) => re.test(name))?.[1] ?? "Bodyweight";

const snap = (name: string, sets: number, reps: string): ExerciseSnap => ({ name, sets, reps, canonicalId: null });

type Row = { name: string; sets: number; reps: string };

/** Pure: reviseWorkout's legacy rows -> typed items (replays the list to find dropped tail moves). */
export const workoutItemsFrom = (
  workout: Pick<PlanWorkout, "id" | "durationMin" | "focus" | "exercises">,
  dayLabel: string,
  changes: readonly CoachReviseChange[],
  intent: PlanReviseIntent,
): ReviseItem[] => {
  let list: Row[] = workout.exercises.map((e) => ({ name: e.name, sets: e.targetSets, reps: e.targetReps }));
  const items: ReviseItem[] = [];
  const ref = { workoutId: workout.id, dayLabel };
  const why = (name: string) =>
    exerciseReason(intent.reasons[`exercise:${name.toLowerCase()}`] ?? intent.reasons[name.toLowerCase()], workout.focus);
  for (const ch of changes) {
    if (ch.kind === "workout_swap" && ch.before && ch.after) {
      const at = list.findIndex((r) => same(r.name, ch.before!));
      const row = list[at] ?? { name: ch.before, sets: 3, reps: "8-12" };
      const reps = BENCH.test(ch.after) && !BENCH.test(ch.before) ? "6-10" : row.reps;
      const next = { name: ch.after, sets: row.sets, reps };
      if (at >= 0) list[at] = next;
      items.push({
        ...ref,
        id: `exercise:swap:${items.length}`,
        kind: "exercise_swap",
        before: snap(row.name, row.sets, row.reps),
        after: snap(next.name, next.sets, next.reps),
        tags: [gearTag(next.name)],
        reason: why(row.name),
      });
    } else if (ch.kind === "workout_remove" && ch.before) {
      const at = list.findIndex((r) => same(r.name, ch.before!));
      const row = list[at] ?? { name: ch.before, sets: 3, reps: "8-12" };
      if (at >= 0) list.splice(at, 1);
      items.push({ ...ref, id: `exercise:remove:${items.length}`, kind: "exercise_remove", before: snap(row.name, row.sets, row.reps), tags: [], reason: why(row.name) });
    } else if (ch.kind === "workout_add" && ch.after) {
      const row = { name: ch.after, sets: 3, reps: "6-10" };
      list = [row, ...list];
      items.push({ ...ref, id: `exercise:add:${items.length}`, kind: "exercise_add", after: snap(row.name, row.sets, row.reps), position: 0, tags: [gearTag(row.name)], reason: why(row.name) });
    } else if (ch.kind === "workout_shorten" && intent.shortenMin != null) {
      const cap = intent.shortenMin;
      const keep = Math.min(list.length, Math.max(MIN_MOVES, Math.round((list.length * cap) / workout.durationMin)));
      const dropped = list.slice(keep).map((r) => r.name);
      list = list.slice(0, keep);
      items.push({
        id: "session_minutes",
        kind: "session_minutes",
        before: workout.durationMin,
        after: cap,
        droppedExercises: dropped,
        tags: [],
        reason: dropped.length > 0 ? `Drops ${dropped.join(", ")}` : null,
      });
    }
  }
  return items;
};

/** Workout side of a proposal (dry run only; nothing is written here). */
export const workoutStep = async (
  db: AppDB,
  state: ReviseState,
  intent: PlanReviseIntent,
  equipment: string[],
  exerciseId?: string,
): Promise<WorkoutStepResult> => {
  const warnings: string[] = [];
  const { workout } = state;
  if (!workout) {
    return { items: [], warnings: ["No lift days left this week, so equipment is saved for future plans"], draft: null };
  }
  const named = intent.exerciseSwaps.length + intent.exerciseAdds.length + intent.exerciseRemoves.length;
  if (named > 0 || intent.scheduleMoves.length > 0) {
    warnings.push(
      `I can't edit exercises or move days by name yet. ${workout.title} has ${workout.exercises.map((e) => e.name).join(", ")}.`,
    );
  }
  const out = await reviseWorkout(db, { workoutId: workout.id, equipment, intent, exerciseId, dryRun: true });
  if (!out) return { items: [], warnings, draft: null };
  warnings.push(...out.warnings);
  const items = workoutItemsFrom(workout, state.dayLabel, out.changes, intent);
  return {
    items,
    warnings,
    draft: items.length > 0 ? { workoutId: workout.id, equipment, intent, ...(exerciseId ? { exerciseId } : {}) } : null,
  };
};
