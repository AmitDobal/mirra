import { muscleRoleOf, type MuscleId } from "@mirra/contracts";

import { libraryEntry, matchExerciseName } from "../../lib/exercise-library";

/**
 * Deterministic exercise tags + reason lines (arch §8.5, AMI-166). "Same muscles" when the
 * primary movers overlap (library), plus the after-exercise equipment. Pure.
 */

type Muscle = { id: MuscleId; pct: number };

const GEAR_WORDS: [RegExp, string][] = [
  [/dumbbell|\bdb\b/i, "Dumbbells"],
  [/kettlebell/i, "Kettlebell"],
  [/\bband/i, "Bands"],
  [/cable|pulldown|pushdown|face pull/i, "Cables"],
  [/machine|leg press|smith|pec deck/i, "Machines"],
  [/barbell|bench press|deadlift|squat|skull/i, "Barbell"],
];

const GEAR_IDS: Record<string, string> = {
  barbell: "Barbell",
  dumbbells: "Dumbbells",
  kettlebell: "Kettlebell",
  cables: "Cables",
  machines: "Machines",
  bands: "Bands",
  bodyweight: "Bodyweight",
};

/** Library muscles for a canonical id or a free-text name; empty when unknown. */
export const musclesOf = (name: string, canonicalId: string | null = null): Muscle[] =>
  (canonicalId ? libraryEntry(canonicalId) : null)?.muscles ?? matchExerciseName(name)?.entry.muscles ?? [];

const primaries = (ms: readonly Muscle[]): MuscleId[] =>
  ms.filter((m) => muscleRoleOf(m.pct) === "primary").map((m) => m.id);

/** Equipment pill: gear named in the title first, else the library entry's first gear. */
export const gearTag = (name: string, canonicalId: string | null = null): string => {
  const byName = GEAR_WORDS.find(([re]) => re.test(name))?.[1];
  if (byName) return byName;
  const entry = (canonicalId ? libraryEntry(canonicalId) : null) ?? matchExerciseName(name)?.entry ?? null;
  const first = entry?.equipment.find((g) => g !== "bench");
  return (first && GEAR_IDS[first]) || "Bodyweight";
};

/** True when the two moves share a primary mover. */
export const sameMuscles = (before: readonly Muscle[], after: readonly Muscle[]): boolean => {
  const a = new Set(primaries(before));
  return primaries(after).some((m) => a.has(m));
};

type Snap = { name: string; canonicalId: string | null };

/** exercise_swap tags: ["Same muscles", "Barbell"] (max 2). */
export const exerciseSwapTags = (before: Snap & { muscles?: readonly Muscle[] }, after: Snap): string[] => {
  const beforeMuscles = before.muscles?.length ? before.muscles : musclesOf(before.name, before.canonicalId);
  const tags = sameMuscles(beforeMuscles, musclesOf(after.name, after.canonicalId)) ? ["Same muscles"] : [];
  return [...tags, gearTag(after.name, after.canonicalId)].slice(0, 2);
};

const label = (m: MuscleId): string => m.replace(/_/g, " ");

/** "Trains chest, triceps" from the primary movers; null when the move is unknown. */
export const trainsLine = (name: string, canonicalId: string | null = null): string | null => {
  const ms = musclesOf(name, canonicalId);
  const top = primaries(ms);
  const list = (top.length > 0 ? top : ms.slice(0, 1).map((m) => m.id)).slice(0, 3);
  return list.length > 0 ? `Trains ${list.map(label).join(", ")}` : null;
};

/** Reason line: AI reason when given, else "Trains <muscles>", else the workout focus. */
export const exerciseRowReason = (
  aiReason: string | undefined,
  after: Snap,
  focus: string | null,
): string | null => aiReason ?? trainsLine(after.name, after.canonicalId) ?? (focus ? `Trains ${focus.toLowerCase()}` : null);
