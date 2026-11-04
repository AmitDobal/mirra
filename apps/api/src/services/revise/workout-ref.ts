import type { ExercisePattern } from "@mirra/contracts";

import { workoutRef } from "../../lib/plan-refs";
import type { PlanWorkout } from "./context";
import { entryOf } from "./exercise-pick";

/**
 * Workout named in chat -> plan workouts (AMI-173): "legs", "leg day", "push", "my upper
 * body workout". Title words first, then the muscle group the words mean (title / focus),
 * then what the exercises mostly train. Pure.
 */

type DayLike = { date: string; workoutId: string | null };
type Group = { ref: RegExp; title: RegExp; patterns: ExercisePattern[] };

const GROUPS: Group[] = [
  { ref: /\b(?:legs?|lower|quads?|glutes?|hamstrings?|squats?)\b/, title: /\b(?:legs?|lower)\b/i, patterns: ["legs"] },
  { ref: /\b(?:push|chest|shoulders?|triceps?|delts?)\b/, title: /\b(?:push|chest|shoulders?)\b/i, patterns: ["push"] },
  { ref: /\b(?:pull|back|biceps?|lats?)\b/, title: /\b(?:pull|back)\b/i, patterns: ["pull"] },
  { ref: /\bupper\b/, title: /\bupper\b/i, patterns: ["push", "pull"] },
  { ref: /\bfull\b/, title: /\bfull\b/i, patterns: [] },
  { ref: /\b(?:core|abs)\b/, title: /\b(?:core|abs)\b/i, patterns: ["core"] },
  { ref: /\b(?:cardio|conditioning|hiit|run|running)\b/, title: /\b(?:cardio|conditioning|hiit|run)\b/i, patterns: [] },
];

const stem = (w: string): string => w.replace(/s$/, "");
const wordsOf = (s: string): string[] => s.toLowerCase().split(/[^a-z]+/).filter(Boolean).map(stem);
const textOf = (w: PlanWorkout): string => `${w.title} ${w.focus ?? ""}`;

/** Main pattern of a workout's exercises (≥ half of the library-known moves), else null. */
const dominantPattern = (w: PlanWorkout): ExercisePattern | null => {
  const counts = new Map<ExercisePattern, number>();
  let known = 0;
  for (const e of w.exercises) {
    const p = entryOf(e)?.pattern;
    if (!p) continue;
    known += 1;
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return best && best[1] * 2 >= known ? best[0] : null;
};

/** Plan workouts a spoken name refers to (best tier only); empty when none. */
export const workoutsForRef = (raw: string, workouts: readonly PlanWorkout[]): PlanWorkout[] => {
  const ref = workoutRef(raw);
  if (!ref) return [];
  const words = wordsOf(ref);
  const byTitle = workouts.filter((w) => {
    const have = new Set(wordsOf(textOf(w)));
    return words.length > 0 && words.every((x) => have.has(x));
  });
  if (byTitle.length > 0) return byTitle;
  const group = GROUPS.find((g) => g.ref.test(ref));
  if (!group) return [];
  const byGroup = workouts.filter((w) => group.title.test(textOf(w)));
  if (byGroup.length > 0) return byGroup;
  return workouts.filter((w) => group.patterns.some((p) => p === dominantPattern(w)));
};

/**
 * Plan day of the named workout: nearest upcoming (today or later) that is not `skipDate`,
 * else its earliest day. Null when the plan has no such workout.
 */
export const dayForWorkoutRef = (
  state: { date: string; plan: { days: readonly DayLike[]; workouts: readonly PlanWorkout[] } },
  raw: string,
  skipDate: string | null = null,
): { date: string; workout: PlanWorkout } | null => {
  const ids = new Set(workoutsForRef(raw, state.plan.workouts).map((w) => w.id));
  if (ids.size === 0) return null;
  const days = [...state.plan.days].filter((d) => d.workoutId && ids.has(d.workoutId)).sort((a, b) => a.date.localeCompare(b.date));
  const day = days.find((d) => d.date >= state.date && d.date !== skipDate) ?? days.find((d) => d.date !== skipDate) ?? days[0];
  const workout = state.plan.workouts.find((w) => w.id === day?.workoutId);
  return day && workout ? { date: day.date, workout } : null;
};

/** "add calf raises to leg day", "on my pull workout": the workout name after to/on/in/for. */
export const workoutNamedIn = (text: string, workouts: readonly PlanWorkout[]): PlanWorkout | null => {
  const re = /\b(?:to|on|in|into|for|from)\s+(?:my\s+|the\s+|our\s+)?([a-z][a-z ]{1,24}?)\s+(?:day|workout|session|training)\b/g;
  for (const m of text.toLowerCase().replace(/[‘’]/g, "'").matchAll(re)) {
    const hit = workoutsForRef(m[1]!, workouts);
    if (hit.length > 0) return hit[0]!;
  }
  return null;
};
