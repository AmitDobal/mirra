import type { CoachReviseChange, ExerciseSnap, MealSlot, MealSnap, ReviseItem } from "@mirra/contracts";

import { sanitizeAiCopy } from "../../lib/ai-copy";

/**
 * Legacy `changes[]` (string before/after) derived from typed items so pre-v2 EAS
 * clients keep rendering the S28 card. Delete with the legacy intent path.
 */

const SLOT: Record<MealSlot, string> = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner" };
const clip = (s: string, n = 34): string => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const meal = (slot: MealSlot, m: MealSnap): string => `${SLOT[slot]} · ${clip(m.name)} · ${Math.round(m.kcal)} kcal`;
const ex = (e: ExerciseSnap): string => `${e.name} ${e.sets}x${e.reps}`;
const list = (xs: readonly string[]): string => xs.join(", ");

const changeOf = (item: ReviseItem): CoachReviseChange => {
  switch (item.kind) {
    case "meal_swap":
      return { kind: "meal_regen", area: "meal", before: meal(item.slot, item.before), after: meal(item.slot, item.after), summary: `Swap ${item.slot}` };
    case "meal_add":
      return { kind: "meal_add", area: "meal", before: `${SLOT[item.slot]} · not planned`, after: meal(item.slot, item.after), summary: `Add ${item.slot}` };
    case "meal_remove":
      return { kind: "meal_remove", area: "meal", before: meal(item.slot, item.before), after: `${SLOT[item.slot]} · removed`, summary: `Drop ${item.slot}` };
    case "exercise_swap":
      return { kind: "workout_swap", area: "workout", before: ex(item.before), after: ex(item.after), summary: `${item.before.name} → ${item.after.name}` };
    case "exercise_add":
      return { kind: "workout_add", area: "workout", before: "Not in session", after: ex(item.after), summary: `Add ${item.after.name}` };
    case "exercise_remove":
      return { kind: "workout_remove", area: "workout", before: ex(item.before), after: "Removed", summary: `Drop ${item.before.name}` };
    case "session_minutes":
      return { kind: "workout_shorten", area: "workout", before: `Session ${item.before} min`, after: `Session ${item.after} min`, summary: `Session ${item.after} min` };
    case "meals_per_day":
      return { kind: "meals_per_day", area: "meal", before: `${item.before} meals a day`, after: `${item.after} meals a day`, summary: `Meals per day: ${item.after}` };
    case "schedule_day_move":
      return { kind: "schedule_move", area: "workout", before: `${item.title} on ${item.fromLabel}`, after: `${item.title} on ${item.toLabel}`, summary: `Move ${item.title} to ${item.toLabel}` };
    case "pref":
      // Explicit label instead of the old "Before: nothing / After: chicken".
      return { kind: `pref_${item.op}`, area: "prefs", summary: `${item.label}: ${list(item.items)}` };
  }
};

export const legacyChanges = (items: readonly ReviseItem[]): CoachReviseChange[] =>
  items.map(changeOf).map((c) => ({ ...c, summary: sanitizeAiCopy(c.summary) }));
