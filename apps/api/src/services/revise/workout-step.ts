import type { ExercisePattern, ReviseItem } from "@mirra/contracts";
import { and, eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import type { AppDB } from "../../db";
import { workoutExercises, workouts } from "../../db/schema";
import { newId } from "../../lib/id";
import type { PlanReviseIntent } from "../../ports/plan-reviser";
import { planWorkoutEdits, type DraftRow } from "../workout-revise";
import { weekdayOf, type PlanWorkout, type ReviseState } from "./context";
import { findRow, resolveName, slotFor } from "./exercise-pick";
import { dayIndexOf, namedDayIn } from "./weekday";
import { workoutNamedIn } from "./workout-ref";

/**
 * Workout side of a proposal (AMI-166): pick the target workout (context id, day named in
 * the text, a workout that has the named move, today / next lift), plan the edit in memory
 * and keep the exact rows. Apply writes them in the same D1 batch as everything else.
 */

/** Stored in `revise_drafts.workout_draft_json`: the full exercise list after the edit. */
export type WorkoutDraft = {
  workoutId: string;
  rows: DraftRow[];
  removedIds: string[];
  durationMin: number;
  calorieEst: number | null;
};

export type WorkoutStepResult = {
  items: ReviseItem[];
  warnings: string[];
  draft: WorkoutDraft | null;
  /** "Thu · Push day" of the workout that was edited. */
  dayLabel: string;
};

type StepOpts = { exerciseId?: string; message?: string; contextWorkoutId?: string };

const hasEdits = (i: PlanReviseIntent): boolean =>
  i.exerciseSwaps.length + i.exerciseAdds.length + i.exerciseRemoves.length + i.preferExercises.length > 0;

/** "Thu · Push day" for a workout: its next plan day (today or later), else its first day. */
export const dayLabelFor = (state: ReviseState, w: PlanWorkout): string => {
  const day =
    state.plan.days.find((d) => d.workoutId === w.id && d.date >= state.date) ??
    state.plan.days.find((d) => d.workoutId === w.id);
  return [day ? weekdayOf(day.date) : null, w.title].filter(Boolean).join(" · ");
};

/** Upcoming lift workouts in day order (today first), then any others in the plan. */
const workoutsInOrder = (state: ReviseState): PlanWorkout[] => {
  const ids = [
    ...state.plan.days.filter((d) => d.date >= state.date).map((d) => d.workoutId),
    ...state.plan.days.map((d) => d.workoutId),
    ...state.plan.workouts.map((w) => w.id),
  ].filter((id): id is string => id != null);
  return [...new Set(ids)].map((id) => state.plan.workouts.find((w) => w.id === id)).filter((w): w is PlanWorkout => w != null);
};

/** Does this workout hold what the first named edit refers to? */
const fits = (w: PlanWorkout, intent: PlanReviseIntent): boolean => {
  const from = intent.exerciseSwaps[0]?.from ?? intent.exerciseRemoves[0];
  if (from) return findRow(w.exercises, from) >= 0;
  const prefer = intent.preferExercises[0];
  const entry = prefer ? resolveName(prefer).entry : null;
  return entry ? slotFor(w.exercises, entry) >= 0 : false;
};

type Target = { workout: PlanWorkout | null; warning?: string };

const DAY_TITLE: Record<ExercisePattern, RegExp> = {
  push: /push|chest|upper/i,
  pull: /pull|back|upper/i,
  legs: /leg|lower/i,
  core: /core|abs/i,
};

/** Target workout for exercise edits (arch §8.4 "Workout day"). */
export const targetWorkout = (state: ReviseState, intent: PlanReviseIntent, opts: StepOpts): Target => {
  if (opts.contextWorkoutId || !hasEdits(intent)) return { workout: state.workout };
  // "add calf raises to leg day": a workout named after to/on/in wins over a weekday (AMI-173).
  const byName = workoutNamedIn(opts.message ?? "", state.plan.workouts);
  if (byName) return { workout: byName };
  const named = intent.scheduleMoves.length > 0 ? null : namedDayIn(opts.message ?? "");
  if (named != null) {
    const idx = dayIndexOf(named, state.date);
    const days = state.plan.days.filter((d) => new Date(`${d.date}T00:00:00Z`).getUTCDay() === idx);
    const day = days.find((d) => d.date >= state.date && d.workoutId) ?? days.find((d) => d.workoutId);
    const workout = state.plan.workouts.find((w) => w.id === day?.workoutId) ?? null;
    if (workout && day && day.date < state.date) {
      return { workout, warning: `${weekdayOf(day.date)} has passed this week, so this edits that day's ${workout.title}` };
    }
    if (workout) return { workout };
    if (days.length > 0) return { workout: null, warning: `${weekdayOf(days[0]!.date)} is a rest day, so there is no workout to edit` };
  }
  const order = workoutsInOrder(state);
  const head = state.workout ? [state.workout, ...order.filter((w) => w.id !== state.workout!.id)] : order;
  const fitting = head.filter((w) => fits(w, intent));
  // "Prefer bench press": a day titled for the pattern (Push day) beats a full-body slot.
  const pattern = intent.preferExercises[0] ? resolveName(intent.preferExercises[0]).entry?.pattern : undefined;
  const titled = pattern ? fitting.find((w) => DAY_TITLE[pattern].test(`${w.title} ${w.focus ?? ""}`)) : undefined;
  return { workout: titled ?? fitting[0] ?? state.workout };
};

/** Plan the workout edit in memory (nothing is written here). */
export const workoutStep = (
  state: ReviseState,
  intent: PlanReviseIntent,
  equipment: string[],
  opts: StepOpts = {},
): WorkoutStepResult => {
  const target = targetWorkout(state, intent, opts);
  const workout = target.workout;
  if (!workout) {
    const gearOnly = !hasEdits(intent) && intent.shortenMin == null;
    const warning = target.warning ?? (gearOnly ? "No lift days left this week, so equipment is saved for future plans" : "No workout in your plan to edit");
    return { items: [], warnings: intent.scheduleMoves.length > 0 && !hasEdits(intent) ? [] : [warning], draft: null, dayLabel: "" };
  }
  const dayLabel = workout.id === state.workout?.id ? state.dayLabel : dayLabelFor(state, workout);
  const out = planWorkoutEdits({
    workout,
    dayLabel,
    equipment,
    intent,
    ...(opts.exerciseId ? { exerciseId: opts.exerciseId } : {}),
    newId,
  });
  const draft: WorkoutDraft | null =
    out.items.length > 0
      ? { workoutId: workout.id, rows: out.rows, removedIds: out.removedIds, durationMin: out.durationMin, calorieEst: out.calorieEst }
      : null;
  const warnings = out.items.length > 0 && target.warning ? [target.warning, ...out.warnings] : out.warnings;
  return { items: out.items, warnings, draft, dayLabel };
};

/** D1 statements that make the workout match the draft exactly (rows, order, canonical ids). */
export const commitWorkoutDraft = (db: AppDB, d: WorkoutDraft): BatchItem<"sqlite">[] => {
  const out: BatchItem<"sqlite">[] = [];
  if (d.removedIds.length > 0) {
    out.push(db.delete(workoutExercises).where(and(eq(workoutExercises.workoutId, d.workoutId), inArray(workoutExercises.id, d.removedIds))));
  }
  for (const [i, r] of d.rows.entries()) {
    const values = {
      name: r.name,
      cue: r.cue,
      targetSets: r.targetSets,
      targetReps: r.targetReps,
      restSec: r.restSec,
      swapGroup: r.swapGroup,
      canonicalId: r.canonicalId,
      sortOrder: i,
    };
    out.push(
      db
        .insert(workoutExercises)
        .values({ id: r.id, workoutId: d.workoutId, ...values })
        .onConflictDoUpdate({ target: workoutExercises.id, set: values }),
    );
  }
  out.push(db.update(workouts).set({ durationMin: d.durationMin, calorieEst: d.calorieEst }).where(eq(workouts.id, d.workoutId)));
  return out;
};

/** Drafts written before AMI-166 carried the intent, not rows. */
export const isRowDraft = (d: unknown): d is WorkoutDraft =>
  typeof d === "object" && d != null && Array.isArray((d as WorkoutDraft).rows);
