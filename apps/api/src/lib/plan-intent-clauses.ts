import type { PlanReviseIntent } from "../ports/plan-reviser";
import { hasAnyIntent, sanitizeIntent } from "./plan-intent";

/**
 * Multi-intent plan chat (AMI-170): "swap my lunch and replace tricep dips with skull
 * crushers, no chicken" is three edits. The whole message is parsed, then every clause on
 * its own; the clause results are merged in, and any clause that asks for something but
 * maps to nothing is reported, so a part is never silently dropped.
 */

/** Words that make a clause a request (a clause without one, like "thanks", is never flagged). */
const ASKS =
  /\b(?:swap|replace|change|switch|add|drop|remove|cut|skip|move|no|not|avoid|without|prefer|more|less|fewer|only|make|use|want|need|shorter|longer|lighter|instead|redo|new|different|stop)\b/;

/** Clause boundaries: punctuation and joining words. */
const JOIN = /[.,;!?\n]+|\s+(?:and|then|also|plus)\s+/;

export const clausesOf = (text: string): string[] =>
  text
    .split(JOIN)
    .map((c) => c.trim())
    .filter((c) => c.length >= 3);

const uniqBy = <T>(xs: readonly T[], key: (x: T) => string): T[] => {
  const seen = new Set<string>();
  return xs.filter((x) => {
    const k = key(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

/** Union of two intents (arrays merged, flags OR-ed, first scalar wins). */
export const mergeIntents = (a: PlanReviseIntent, b: PlanReviseIntent): PlanReviseIntent => {
  const lower = (s: string) => s.toLowerCase();
  return sanitizeIntent({
    ...b,
    ...a,
    equipmentAdd: [...a.equipmentAdd, ...b.equipmentAdd],
    equipmentRemove: [...a.equipmentRemove, ...b.equipmentRemove],
    foodsAvoidAdd: [...a.foodsAvoidAdd, ...b.foodsAvoidAdd],
    dietTagsAdd: [...a.dietTagsAdd, ...b.dietTagsAdd],
    cuisineStylesAdd: [...a.cuisineStylesAdd, ...b.cuisineStylesAdd],
    cuisineStylesOnly: Boolean(a.cuisineStylesOnly || b.cuisineStylesOnly),
    forceMealRegen: a.forceMealRegen || b.forceMealRegen,
    reviseWorkout: a.reviseWorkout || b.reviseWorkout,
    preferBench: Boolean(a.preferBench || b.preferBench),
    mealSlots: [...a.mealSlots, ...b.mealSlots],
    exerciseSwaps: uniqBy([...a.exerciseSwaps, ...b.exerciseSwaps], (s) => lower(s.from)),
    exerciseAdds: uniqBy([...a.exerciseAdds, ...b.exerciseAdds], (x) => lower(x.name)),
    exerciseRemoves: [...a.exerciseRemoves, ...b.exerciseRemoves],
    preferExercises: [...a.preferExercises, ...b.preferExercises],
    scheduleMoves: uniqBy([...a.scheduleMoves, ...b.scheduleMoves], (m) => `${m.from}>${m.to}`),
    reasons: { ...b.reasons, ...a.reasons },
  });
};

/**
 * Parse the whole message, then each clause. A clause found nothing on its own and the
 * whole-message parse did not cover it either -> `unmapped` (quoted back to the user).
 */
export const parseByClause = (
  text: string,
  parse: (t: string) => PlanReviseIntent,
): { intent: PlanReviseIntent; unmapped: string[] } => {
  let intent = parse(text);
  const clauses = clausesOf(text);
  if (clauses.length <= 1) return { intent, unmapped: [] };
  const unmapped: string[] = [];
  for (const clause of clauses) {
    const part = parse(clause);
    if (hasAnyIntent(part)) intent = mergeIntents(intent, part);
    else if (ASKS.test(clause) && !coveredByBias(clause, intent)) unmapped.push(clause);
  }
  return { intent, unmapped };
};

/** "for something higher protein" style tails are carried by the whole-message bias. */
const coveredByBias = (clause: string, intent: PlanReviseIntent): boolean =>
  intent.mealBias != null && /\b(?:protein|carbs?|lighter|calories)\b/.test(clause);

export const unmappedWarnings = (unmapped: readonly string[]): string[] =>
  unmapped.length === 0
    ? []
    : [`I couldn't map ${unmapped.map((c) => `"${c}"`).join(", ")} to a plan change. Try saying it another way`];
