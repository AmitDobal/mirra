import type { CurrentPlanResponse, ExerciseSnap, ReviseItem } from "@mirra/contracts";

import type { PlanReviseIntent } from "../ports/plan-reviser";
import {
  defaultDose,
  entryOf,
  findRow,
  fromEntry,
  idsIn,
  pickAlternative,
  resolveName,
  slotFor,
  type Resolved,
} from "./revise/exercise-pick";
import { exerciseRowReason, exerciseSwapTags, gearTag } from "./revise/tags-exercise";
import { gearAllows, gearNeeded, hasGear, pickSwap } from "./workout-swaps";

/**
 * Pure workout draft planner (arch §8.4/§8.5, AMI-166). Applies, in order: gear-loss swaps,
 * named swaps, removes, adds, preferred moves, shorter session. Returns typed items plus the
 * exact rows apply writes (ids pre-assigned, canonical ids set). No D1, no AI.
 */

export type DraftRow = {
  id: string;
  name: string;
  cue: string | null;
  targetSets: number;
  targetReps: string;
  restSec: number | null;
  swapGroup: string | null;
  canonicalId: string | null;
};

export type PlanTarget = {
  id: string;
  title: string;
  focus: string | null;
  durationMin: number;
  calorieEst: number | null;
  exercises: readonly Pick<PlanExercise, "id" | "name" | "cue" | "targetSets" | "targetReps" | "restSec" | "swapGroup" | "canonicalId">[];
};

export type WorkoutPlanInput = {
  workout: PlanTarget;
  dayLabel: string;
  /** Equipment the user has AFTER this revision. */
  equipment: readonly string[];
  intent: PlanReviseIntent;
  /** Limit gear-loss swaps to one exercise (exercise detail screen). */
  exerciseId?: string;
  newId: () => string;
};

export type WorkoutPlanResult = {
  items: ReviseItem[];
  warnings: string[];
  rows: DraftRow[];
  removedIds: string[];
  durationMin: number;
  calorieEst: number | null;
};

type PlanExercise = CurrentPlanResponse["workouts"][number]["exercises"][number];

const MIN_MOVES = 2;

const snap = (r: Pick<DraftRow, "name" | "targetSets" | "targetReps" | "canonicalId">): ExerciseSnap => ({
  name: r.name,
  sets: r.targetSets,
  reps: r.targetReps,
  canonicalId: r.canonicalId,
});

export const planWorkoutEdits = (input: WorkoutPlanInput): WorkoutPlanResult => {
  const { workout, dayLabel, intent } = input;
  const has = hasGear(input.equipment);
  let rows: DraftRow[] = workout.exercises.map((e) => ({
    id: e.id,
    name: e.name,
    cue: e.cue,
    targetSets: e.targetSets,
    targetReps: e.targetReps,
    restSec: e.restSec,
    swapGroup: e.swapGroup,
    canonicalId: e.canonicalId ?? null,
  }));
  const items: ReviseItem[] = [];
  const warnings: string[] = [];
  const ref = { workoutId: workout.id, dayLabel };
  const names = () => rows.map((r) => r.name).join(", ");
  const why = (...keys: string[]) =>
    keys.map((k) => k.toLowerCase()).map((k) => intent.reasons[`exercise:${k}`] ?? intent.reasons[k]).find(Boolean);

  const swapAt = (at: number, to: Resolved, keepDose: boolean, reasonKeys: string[]) => {
    const prev = rows[at]!;
    const dose = defaultDose(to.entry);
    const next: DraftRow = {
      ...prev,
      name: to.name,
      canonicalId: to.canonicalId,
      cue: null,
      ...(keepDose ? {} : { targetSets: dose.sets, targetReps: dose.reps, restSec: dose.restSec }),
    };
    rows[at] = next;
    items.push({
      ...ref,
      id: `exercise:swap:${items.length}`,
      kind: "exercise_swap",
      before: snap(prev),
      after: snap(next),
      tags: exerciseSwapTags(prev, next),
      reason: exerciseRowReason(why(prev.name, next.name, ...reasonKeys), next, workout.focus),
    });
  };
  /** Same pattern keeps sets x reps; a different (known) pattern takes library defaults. */
  const keepsDose = (prev: DraftRow, to: Resolved) => {
    const p = entryOf(prev)?.pattern;
    return !p || !to.entry || to.entry.pattern === p;
  };

  // 1. Gear the user no longer has (legacy behavior, now full_gym aware).
  const stuck: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const ex = rows[i]!;
    if (input.exerciseId && ex.id !== input.exerciseId) continue;
    const need = gearNeeded(ex.name);
    if (!need || has(need)) continue;
    const next = pickSwap(ex.name, need, has);
    if (!next) {
      stuck.push(ex.name);
      continue;
    }
    const to = resolveName(next);
    const dup = rows.some((o, j) => j !== i && o.name.trim().toLowerCase() === next.toLowerCase());
    if (dup && rows.length > MIN_MOVES) {
      items.push({ ...ref, id: `exercise:remove:${items.length}`, kind: "exercise_remove", before: snap(ex), tags: [], reason: `Needs ${need}; ${next} is already in the session` });
      rows.splice(i, 1);
      i -= 1;
      continue;
    }
    swapAt(i, { ...to, name: to.entry ? to.name : next }, true, []);
  }
  if (stuck.length > 0) warnings.push(`No substitute found for ${stuck.join(", ")}`);

  // 2. "Replace X with Y" / "swap out X".
  for (const sw of intent.exerciseSwaps) {
    const at = findRow(rows, sw.from);
    if (at < 0) {
      warnings.push(`No '${sw.from}' in ${dayLabel}. Your moves: ${names()}`);
      continue;
    }
    const prev = rows[at]!;
    const prevEntry = entryOf(prev);
    let to: Resolved | null = sw.to ? resolveName(sw.to) : null;
    if (!to) {
      const alt = pickAlternative({
        muscles: prevEntry?.muscles ?? [],
        pattern: prevEntry?.pattern ?? null,
        has,
        exclude: new Set([...idsIn(rows), ...(prevEntry ? [prevEntry.id] : [])]),
      });
      if (!alt) {
        warnings.push(`No substitute found for ${prev.name} with your equipment`);
        continue;
      }
      to = fromEntry(alt);
    }
    if ((to.canonicalId && to.canonicalId === prevEntry?.id) || to.name.toLowerCase() === prev.name.toLowerCase()) {
      warnings.push(`${prev.name} is already in ${dayLabel}`);
      continue;
    }
    swapAt(at, to, keepsDose(prev, to), [sw.from, sw.to ?? ""]);
  }

  // 3. Removes (a session keeps at least 2 moves).
  const removedIds: string[] = [];
  for (const name of intent.exerciseRemoves) {
    const at = findRow(rows, name);
    if (at < 0) {
      warnings.push(`No '${name}' in ${dayLabel}. Your moves: ${names()}`);
      continue;
    }
    if (rows.length <= MIN_MOVES) {
      warnings.push(`Kept ${rows[at]!.name}: a session needs at least ${MIN_MOVES} moves`);
      continue;
    }
    const [gone] = rows.splice(at, 1);
    items.push({ ...ref, id: `exercise:remove:${items.length}`, kind: "exercise_remove", before: snap(gone!), tags: [], reason: why(gone!.name, name) ?? null });
  }

  /** Insert a library move; swaps in a doable same-muscle variant when the gear is missing. */
  const insert = (spoken: string, at: number, dose: Partial<{ sets: number; reps: string }>, reasonKeys: string[]) => {
    let to = resolveName(spoken);
    if (to.entry && !gearAllows(to.entry.equipment, has)) {
      const alt = pickAlternative({ muscles: to.entry.muscles, pattern: to.entry.pattern, has, exclude: idsIn(rows) });
      if (!alt) {
        warnings.push(`${to.name} needs gear you don't have`);
        return;
      }
      warnings.push(`${to.name} needs gear you don't have, so I used ${alt.name}`);
      to = fromEntry(alt);
    }
    const dup = findRow(rows, to.name);
    if (dup >= 0 || (to.canonicalId && idsIn(rows).has(to.canonicalId))) {
      warnings.push(`${to.name} is already in ${dayLabel}`);
      return;
    }
    const base = defaultDose(to.entry);
    const row: DraftRow = {
      id: input.newId(),
      name: to.name,
      cue: null,
      targetSets: dose.sets ?? base.sets,
      targetReps: dose.reps ?? base.reps,
      restSec: base.restSec,
      swapGroup: to.entry?.pattern ?? null,
      canonicalId: to.canonicalId,
    };
    const position = Math.min(at, rows.length);
    rows.splice(position, 0, row);
    items.push({
      ...ref,
      id: `exercise:add:${items.length}`,
      kind: "exercise_add",
      after: snap(row),
      position,
      tags: [gearTag(row.name, row.canonicalId)],
      reason: exerciseRowReason(why(row.name, ...reasonKeys), row, workout.focus),
    });
  };

  // 4. Adds go to the end of the session.
  for (const a of intent.exerciseAdds) {
    insert(a.name, rows.length, { ...(a.sets ? { sets: a.sets } : {}), ...(a.reps ? { reps: a.reps } : {}) }, [a.name]);
  }

  // 5. Preferred moves: take over the same-pattern slot, else lead the session.
  for (const spoken of intent.preferExercises) {
    let to = resolveName(spoken);
    if (to.entry && !gearAllows(to.entry.equipment, has)) {
      const alt = pickAlternative({ muscles: to.entry.muscles, pattern: to.entry.pattern, has, exclude: new Set() });
      if (!alt) {
        warnings.push(`${to.name} needs gear you don't have`);
        continue;
      }
      to = fromEntry(alt);
    }
    if (findRow(rows, to.name) >= 0 || (to.canonicalId && idsIn(rows).has(to.canonicalId))) {
      warnings.push(`${to.name} is already in ${dayLabel}`);
      continue;
    }
    const slot = to.entry ? slotFor(rows, to.entry) : -1;
    if (slot >= 0) swapAt(slot, to, true, [spoken]);
    else insert(to.name, 0, {}, [spoken]);
  }

  // 6. Shorter session: cap duration, drop tail moves proportionally.
  let durationMin = workout.durationMin;
  let calorieEst = workout.calorieEst;
  const cap = intent.shortenMin;
  if (cap != null && cap < durationMin) {
    const keep = Math.min(rows.length, Math.max(MIN_MOVES, Math.round((rows.length * cap) / durationMin)));
    const dropped = rows.slice(keep).map((r) => r.name);
    rows = rows.slice(0, keep);
    if (calorieEst != null) calorieEst = Math.round((calorieEst * cap) / durationMin);
    items.push({
      id: "session_minutes",
      kind: "session_minutes",
      before: durationMin,
      after: cap,
      droppedExercises: dropped,
      tags: [],
      reason: dropped.length > 0 ? `Drops ${dropped.join(", ")}` : null,
    });
    durationMin = cap;
  } else if (cap != null) {
    warnings.push(`Session is already ${durationMin} min`);
  }

  const kept = new Set(rows.map((r) => r.id));
  removedIds.push(...workout.exercises.map((e) => e.id).filter((id) => !kept.has(id)));
  return { items, warnings, rows, removedIds, durationMin, calorieEst };
};
