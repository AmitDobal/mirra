import type { ExercisePattern, MuscleId } from "@mirra/contracts";

import { EXERCISE_LIBRARY } from "../../data/exercises";
import {
  libraryEntry,
  matchExerciseName,
  normalize,
  tokensOf,
  type LibraryExercise,
} from "../../lib/exercise-library";
import { gearAllows } from "../workout-swaps";
import { sameMuscles } from "./tags-exercise";

/**
 * Pure exercise targeting for plan chat (arch §8.4, AMI-166): match a spoken name against
 * a workout's rows, resolve a new name through the AMI-161 library, pick a same-muscle
 * substitute the user's gear allows.
 */

export type RowLike = { name: string; canonicalId: string | null };
type Muscle = { id: MuscleId; pct: number };

/** Library entry behind a row: stored canonical id first, else a library-only name match. */
export const entryOf = (row: RowLike): LibraryExercise | null =>
  (row.canonicalId ? libraryEntry(row.canonicalId) : null) ?? matchExerciseName(row.name)?.entry ?? null;

/**
 * Index of the row the user meant: same normalized name, then same canonical id, then every
 * word of the query inside the row name ("lunges" -> "Walking lunges"). -1 when none.
 */
export const findRow = (rows: readonly RowLike[], query: string): number => {
  const q = normalize(query);
  if (!q) return -1;
  const exact = rows.findIndex((r) => normalize(r.name) === q);
  if (exact >= 0) return exact;
  const id = matchExerciseName(query)?.entry.id;
  if (id) {
    const byId = rows.findIndex((r) => entryOf(r)?.id === id);
    if (byId >= 0) return byId;
  }
  const words = tokensOf(q);
  return rows.findIndex((r) => {
    const have = new Set(tokensOf(normalize(r.name)));
    return words.every((w) => have.has(w));
  });
};

const titleCase = (s: string): string =>
  s
    .trim()
    .split(/\s+/)
    .map((w) => (w.length > 2 ? `${w[0]!.toUpperCase()}${w.slice(1)}` : w))
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());

export type Resolved = { name: string; canonicalId: string | null; entry: LibraryExercise | null };

/** "skull crushers" -> { name: "Skull Crusher", canonicalId: "skull_crusher" }. Unknown names stay as typed. */
export const resolveName = (spoken: string): Resolved => {
  const entry = matchExerciseName(spoken)?.entry ?? null;
  return entry
    ? { name: entry.name, canonicalId: entry.id, entry }
    : { name: titleCase(spoken), canonicalId: null, entry: null };
};

export const fromEntry = (entry: LibraryExercise): Resolved => ({ name: entry.name, canonicalId: entry.id, entry });

/** Shared involvement: sum of min(pct) over muscles both moves train. */
const overlap = (a: readonly Muscle[], b: readonly Muscle[]): number =>
  a.reduce((sum, m) => sum + Math.min(m.pct, b.find((x) => x.id === m.id)?.pct ?? 0), 0);

type AltArgs = {
  muscles: readonly Muscle[];
  pattern: ExercisePattern | null;
  has: (gear: string) => boolean;
  /** Canonical ids that must not be picked (already in the session, the move itself). */
  exclude: ReadonlySet<string>;
};

/** Best same-muscle library move the user's gear allows (same pattern when known), or null. */
export const pickAlternative = (a: AltArgs): LibraryExercise | null => {
  let best: LibraryExercise | null = null;
  let bestScore = 0;
  for (const e of EXERCISE_LIBRARY) {
    if (a.exclude.has(e.id) || (a.pattern && e.pattern !== a.pattern)) continue;
    if (!gearAllows(e.equipment, a.has) || !sameMuscles(a.muscles, e.muscles)) continue;
    const score = overlap(a.muscles, e.muscles);
    if (score > bestScore) {
      best = e;
      bestScore = score;
    }
  }
  return best;
};

/**
 * Slot a preferred move should replace: same pattern, shares a primary mover, most overlap.
 * -1 when the session has no such slot.
 */
export const slotFor = (rows: readonly RowLike[], target: LibraryExercise): number => {
  let at = -1;
  let bestScore = 0;
  rows.forEach((r, i) => {
    const e = entryOf(r);
    if (!e || e.pattern !== target.pattern || !sameMuscles(e.muscles, target.muscles)) return;
    const score = overlap(e.muscles, target.muscles);
    if (score > bestScore) {
      at = i;
      bestScore = score;
    }
  });
  return at;
};

export type Dose = { sets: number; reps: string; restSec: number };

/** Library defaults for a new pattern / an added move, by how the lift is scored. */
export const defaultDose = (entry: LibraryExercise | null): Dose => {
  if (entry?.scoring === "time") return { sets: 3, reps: "30-45s", restSec: 45 };
  if (entry?.scoring === "reps" || entry?.scoring === "bodyweight") return { sets: 3, reps: "10-15", restSec: 60 };
  return { sets: 3, reps: "8-12", restSec: 90 };
};

/** Canonical ids already in the session (rows without a library match are skipped). */
export const idsIn = (rows: readonly RowLike[]): Set<string> =>
  new Set(rows.map((r) => entryOf(r)?.id).filter((x): x is string => x != null));
