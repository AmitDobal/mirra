import type { ContextEnvelope, HardConstraint } from "@mirra/contracts";

import { VETTED_FOODS, type VettedFood } from "../data/vetted-foods";
import { avoidWordsOf, excludedTagsFor, filterCatalog, keywordsForTags } from "../lib/meal-diet";

/**
 * Deterministic hard-constraint checks for Chef chat and recipes (no tokens spent).
 * Constraints come ONLY from the envelope (explicit settings). The model never widens them.
 * Used before the LLM (user asks for a banned food) and after it (reply names a banned food).
 */
export type SafetyRules = {
  /** Catalog foods this user may eat (diet, avoid list and cuisine all applied). */
  allowed: VettedFood[];
  /** Lowercase words/phrases that must never be suggested. */
  forbiddenTerms: string[];
};

const valuesOf = (envelope: ContextEnvelope, type: HardConstraint["type"]): string[] =>
  envelope.hardConstraints.filter((c) => c.type === type).map((c) => c.value);

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const termRegex = (term: string): RegExp => new RegExp(`\\b${escapeRe(term)}(?:s|es)?\\b`, "i");

const singular = (w: string): string => (w.endsWith("s") && w.length > 3 ? w.slice(0, -1) : w);

/** `mealFoodNames`: items already in the planned meal are never flagged (they predate a pref change). */
export const buildSafetyRules = (
  envelope: ContextEnvelope,
  mealFoodNames: readonly string[] = [],
): SafetyRules => {
  const diet = valuesOf(envelope, "diet");
  const foodsAvoid = [...valuesOf(envelope, "avoid_food"), ...valuesOf(envelope, "allergy")].join(", ");
  const cuisines = valuesOf(envelope, "cuisine_only");
  const excludedTags = excludedTagsFor(diet, foodsAvoid);
  const allowed = filterCatalog(diet, foodsAvoid, cuisines);

  const terms = new Set<string>();
  for (const w of avoidWordsOf(foodsAvoid)) terms.add(singular(w));
  for (const tag of excludedTags) terms.add(tag);
  for (const w of keywordsForTags(excludedTags)) terms.add(w);

  const allowedIds = new Set(allowed.map((f) => f.id));
  for (const f of VETTED_FOODS) {
    if (!allowedIds.has(f.id)) terms.add(f.name.toLowerCase());
  }
  const inMeal = mealFoodNames.map((n) => n.toLowerCase());
  const forbiddenTerms = [...terms].filter((t) => !inMeal.some((n) => n.includes(t)));
  return { allowed, forbiddenTerms };
};

/** First forbidden term found in `text`, else null. Post-LLM check on replies and recipe steps. */
export const findForbiddenTerm = (text: string, rules: SafetyRules): string | null => {
  for (const term of rules.forbiddenTerms) if (termRegex(term).test(text)) return term;
  return null;
};

const NEGATION_BEFORE =
  /\b(?:no|without|not|avoid|avoiding|never|exclude|skip|hate|allergic to|free of|instead of|replace|replacing|swap|remove|drop|ditch|cant|can't|dont|don't)\b[^.?!]{0,20}$/i;
const FREE_AFTER = /^\s*-?\s*free\b/i;

/** Pre-LLM: the user asks to ADD a banned food ("add peanuts"). Mentions like "no peanuts" pass. */
export const findRequestedViolation = (message: string, rules: SafetyRules): string | null => {
  for (const term of rules.forbiddenTerms) {
    const match = termRegex(term).exec(message);
    if (!match) continue;
    const before = message.slice(0, match.index);
    const after = message.slice(match.index + match[0].length);
    if (NEGATION_BEFORE.test(before) || FREE_AFTER.test(after)) continue;
    return term;
  }
  return null;
};

export const constraintViolationReply = (term: string): string =>
  `I can't suggest ${term} because it's on your avoid list. Ask for another swap and I'll pick something that fits. Always check labels for hidden ingredients.`;
