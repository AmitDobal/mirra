/**
 * Set → effective load → e1RM (Epley) → the value compared against standards.
 * `weight_kg` on a bodyweight lift is the ADDED load (arch §4).
 */
import type { ExerciseScoring } from "@mirra/contracts";

export type LoggedSet = { weightKg: number | null; reps: number | null };

export type ScoredLift = { scoring: ExerciseScoring; bwFactor?: number };

/** Load lifts: reps outside 1..15 are not working sets (Epley drifts past 15). */
export const MAX_LOAD_REPS = 15;
/** Bodyweight lifts: reps above this are treated as bad input (research §2.4 outlier filter). */
export const MAX_BW_REPS = 60;
/** Load sets below this share of the session's top load are warm-ups. */
export const WARMUP_SHARE = 0.5;

export const e1rm = (load: number, reps: number): number => load * (1 + reps / 30);

/**
 * kg moved per rep. Bodyweight lifts: `bw × bwFactor + added`. Null when the set
 * cannot be scored (no load, no bodyweight for a bodyweight lift).
 */
export const effectiveLoad = (set: LoggedSet, lift: ScoredLift, bw: number | null): number | null => {
  if (lift.scoring === "load") return set.weightKg != null && set.weightKg > 0 ? set.weightKg : null;
  if (lift.scoring === "bodyweight") {
    if (bw == null || bw <= 0) return null;
    return Math.max(0, bw * (lift.bwFactor ?? 1) + (set.weightKg ?? 0));
  }
  return null;
};

/** Value in standard units: e1RM kg (load/bodyweight), reps (reps), seconds in `reps` (time). */
export const setValue = (set: LoggedSet, lift: ScoredLift, bw: number | null): number | null => {
  const reps = set.reps ?? 0;
  if (reps <= 0) return null;
  if (lift.scoring === "reps" || lift.scoring === "time") return reps;
  const load = effectiveLoad(set, lift, bw);
  return load == null ? null : e1rm(load, reps);
};

/**
 * Working sets for one exercise in one session: completed, sane reps, and for load lifts
 * not below WARMUP_SHARE of the session's heaviest working load.
 */
export const workingSets = <T extends LoggedSet>(sets: readonly T[], lift: ScoredLift): T[] => {
  const repsOk = (s: T): boolean => {
    const r = s.reps ?? 0;
    if (r < 1) return false;
    if (lift.scoring === "load") return r <= MAX_LOAD_REPS;
    if (lift.scoring === "bodyweight") return r <= MAX_BW_REPS;
    return true;
  };
  const ok = sets.filter(repsOk);
  if (lift.scoring !== "load") return ok;
  const loaded = ok.filter((s) => (s.weightKg ?? 0) > 0);
  const top = Math.max(0, ...loaded.map((s) => s.weightKg ?? 0));
  return loaded.filter((s) => (s.weightKg ?? 0) >= top * WARMUP_SHARE);
};

/** Best set (highest value) among working sets, or null. */
export const bestSet = <T extends LoggedSet>(
  sets: readonly T[],
  lift: ScoredLift,
  bw: number | null,
): { set: T; value: number } | null => {
  let best: { set: T; value: number } | null = null;
  for (const s of workingSets(sets, lift)) {
    const value = setValue(s, lift, bw);
    if (value != null && (!best || value > best.value)) best = { set: s, value };
  }
  return best;
};
