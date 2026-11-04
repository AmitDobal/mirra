/**
 * One completed session → updated exercise scores (arch §6.3 step 2). Pure.
 * Lifts outside the library, or without a standard, are skipped: they count toward
 * volume and anatomy elsewhere but never get a tier.
 */
import { libraryEntry, type ExerciseStandard, type LibraryExercise } from "../exercise-library";
import { bestSet, type LoggedSet } from "./e1rm";
import { anchorsForStandard, pctOf, type Anchors, type StrengthSex } from "./percentile";
import { nextExerciseScore, type ExerciseScoreState } from "./sustain";

export type RankedLift = { entry: LibraryExercise; standard: ExerciseStandard };

/** Library entry with a standard, else null. */
export const rankedLift = (exerciseId: string): RankedLift | null => {
  const entry = libraryEntry(exerciseId);
  return entry?.standard ? { entry, standard: entry.standard } : null;
};

export const liftAnchors = (lift: RankedLift, sex: StrengthSex, bw: number): Anchors =>
  anchorsForStandard(lift.standard, sex, bw);

export type ExerciseScoreRow = ExerciseScoreState & {
  exerciseId: string;
  bestE1rmKg: number | null;
  bestWeightKg: number | null;
  bestReps: number | null;
};

export type SessionSet = LoggedSet & { canonicalId: string };

export type SessionInput = {
  sets: readonly SessionSet[];
  prev: ReadonlyMap<string, ExerciseScoreRow>;
  sex: StrengthSex;
  bw: number;
};

/** Best-set pct per ranked exercise in this session. */
export const sessionPcts = (input: SessionInput): Map<string, { pct: number; value: number; set: LoggedSet }> => {
  const byId = new Map<string, SessionSet[]>();
  for (const s of input.sets) byId.set(s.canonicalId, [...(byId.get(s.canonicalId) ?? []), s]);
  const out = new Map<string, { pct: number; value: number; set: LoggedSet }>();
  for (const [id, sets] of byId) {
    const lift = rankedLift(id);
    if (!lift) continue;
    const best = bestSet(sets, lift.entry, input.bw);
    if (!best) continue;
    out.set(id, { pct: pctOf(best.value, liftAnchors(lift, input.sex, input.bw)), value: best.value, set: best.set });
  }
  return out;
};

/** Updated rows for the exercises this session touched (others are untouched: rest never lowers). */
export const scoreSession = (input: SessionInput): Map<string, ExerciseScoreRow> => {
  const out = new Map<string, ExerciseScoreRow>();
  for (const [id, s] of sessionPcts(input)) {
    const prev = input.prev.get(id) ?? null;
    const next = nextExerciseScore(prev, s.pct);
    const isBest = !prev || s.pct >= prev.bestPct;
    const scoring = rankedLift(id)!.entry.scoring;
    const e1rmKg = scoring === "load" || scoring === "bodyweight" ? s.value : null;
    out.set(id, {
      ...next,
      exerciseId: id,
      bestE1rmKg: isBest ? e1rmKg : (prev?.bestE1rmKg ?? null),
      bestWeightKg: isBest ? s.set.weightKg : (prev?.bestWeightKg ?? null),
      bestReps: isBest ? s.set.reps : (prev?.bestReps ?? null),
    });
  }
  return out;
};
