import type { ExercisePattern, ExerciseScoring, MuscleId } from "@mirra/contracts";

/** Lifts with their own strength-standard table (AMI-165 owns the numbers). */
export const ANCHOR_IDS = [
  "back_squat",
  "bench_press",
  "deadlift",
  "overhead_press",
  "pull_up",
  "push_up",
  "plank",
] as const;

export type AnchorId = (typeof ANCHOR_IDS)[number];

/**
 * `anchor`: the lift has its own table. `parent`: derived as anchor × ratio.
 * Ratios here are provisional placeholders; AMI-165 calibrates them.
 */
export type ExerciseStandard = { anchor: AnchorId } | { parent: AnchorId; ratio: number };

export type LibraryMuscle = { id: MuscleId; pct: number };

export type LibraryExercise = {
  id: string;
  name: string;
  /** Loose forms; the index normalizes them with `normalize()`. */
  aliases: string[];
  /** Onboarding equipment ids: barbell, dumbbells, machines, cables, bands, bodyweight, bench, kettlebell. */
  equipment: string[];
  pattern: ExercisePattern;
  /** Sums to 100, sorted high to low. */
  muscles: LibraryMuscle[];
  scoring: ExerciseScoring;
  bwFactor?: number;
  standard?: ExerciseStandard;
};

type Extra = { bwFactor?: number; standard?: ExerciseStandard };

/** Compact entry builder for the data files. */
export const defineExercise = (
  id: string,
  name: string,
  pattern: ExercisePattern,
  equipment: string[],
  muscles: Partial<Record<MuscleId, number>>,
  scoring: ExerciseScoring,
  aliases: string[],
  extra: Extra = {},
): LibraryExercise => ({
  id,
  name,
  aliases,
  equipment,
  pattern,
  muscles: (Object.entries(muscles) as [MuscleId, number][])
    .map(([mid, pct]) => ({ id: mid, pct }))
    .sort((a, b) => b.pct - a.pct),
  scoring,
  ...extra,
});

export const anchor = (id: AnchorId): ExerciseStandard => ({ anchor: id });
export const derived = (parent: AnchorId, ratio: number): ExerciseStandard => ({ parent, ratio });
