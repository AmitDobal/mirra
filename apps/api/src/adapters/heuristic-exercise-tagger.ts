import type { MuscleId } from "@mirra/contracts";

import { normalize } from "../lib/exercise-library/normalize";
import { ruleFor } from "../lib/exercise-library/keywords";
import type { ExerciseTag, ExerciseTagger } from "../ports/exercise-tagger";

/** Keyword tag for one name. Never null: unknown words get the full-body default. */
export const heuristicTag = (name: string): ExerciseTag => {
  const rule = ruleFor(normalize(name));
  const muscles = (Object.entries(rule.muscles) as [MuscleId, number][])
    .map(([id, pct]) => ({ id, pct }))
    .sort((a, b) => b.pct - a.pct);
  return {
    name,
    canonicalId: null,
    muscles,
    scoring: rule.scoring,
    pattern: rule.pattern,
    source: "heuristic",
    model: null,
  };
};

/** Deterministic, offline ExerciseTagger (no key, budget hit, or AI output failed Zod). */
export const heuristicExerciseTagger: ExerciseTagger = {
  provider: "heuristic",
  tag: async ({ names }) => names.map(heuristicTag),
};
