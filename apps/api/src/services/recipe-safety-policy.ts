import type { ContextEnvelope, HardConstraint } from "@mirra/contracts";

import { VETTED_FOODS, type VettedFood } from "../data/vetted-foods";
import {
  findBannedTerm,
  hardPartOf,
  neverIncludeList,
  type DietConstraints,
} from "../lib/diet-constraints";
import { dietCatalog } from "../lib/meal-diet";

/**
 * Deterministic hard-constraint checks for Chef chat and recipes (no tokens spent).
 * Constraints come ONLY from the envelope (explicit settings) plus the AMI-199 resolver
 * (cuisine cultural defaults, timezone). The model never widens them.
 * Used before the LLM (user asks for a banned food) and after it (reply names a banned food).
 */
export type SafetyRules = {
  /** Catalog foods this user may eat (diet, avoid list and cuisine all applied). */
  allowed: VettedFood[];
  /** Lowercase words/phrases that must never be suggested. */
  forbiddenTerms: string[];
  /** Short prompt list ("beef (incl. steak, veal…)", "pork …"). */
  neverInclude: string[];
  /** Resolved constraints with `terms` = `forbiddenTerms` (qualified words kept). */
  diet: DietConstraints;
  /** Phrases cleared before scanning (allowed catalog names + planned items without beef/pork). */
  safe: string[];
  /** Beef/pork word in the planned meal itself (legacy row), else null. */
  mealViolation: string | null;
};

const valuesOf = (envelope: ContextEnvelope, type: HardConstraint["type"]): string[] =>
  envelope.hardConstraints.filter((c) => c.type === type).map((c) => c.value);

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const termRegex = (term: string): RegExp => new RegExp(`\\b${escapeRe(term)}(?:s|es)?\\b`, "i");

/** `mealFoodNames`: items already in the planned meal are never flagged, except beef/pork (AMI-199). */
export const buildSafetyRules = (
  envelope: ContextEnvelope,
  mealFoodNames: readonly string[] = [],
  timezone?: string | null,
): SafetyRules => {
  const { constraints, foods: allowed } = dietCatalog({
    dietTags: valuesOf(envelope, "diet"),
    foodsAvoid: [...valuesOf(envelope, "avoid_food"), ...valuesOf(envelope, "allergy")].join(", "),
    cuisineStyles: valuesOf(envelope, "cuisine_only"),
    timezone,
  });
  const hard = hardPartOf(constraints);

  const terms = new Set<string>([...constraints.terms, ...constraints.bannedTags.filter((t) => !t.includes("_"))]);
  const allowedIds = new Set(allowed.map((f) => f.id));
  for (const f of VETTED_FOODS) {
    if (!allowedIds.has(f.id)) terms.add(f.name.toLowerCase());
  }
  const hardTerms = new Set(hard.terms);
  const inMeal = mealFoodNames.map((n) => n.toLowerCase());
  const forbiddenTerms = [...terms].filter((t) => hardTerms.has(t) || !inMeal.some((n) => n.includes(t)));
  const mealViolation = inMeal.map((n) => findBannedTerm(n, hard)).find((t) => t !== null) ?? null;
  return {
    allowed,
    forbiddenTerms,
    neverInclude: neverIncludeList(constraints),
    diet: { ...constraints, terms: forbiddenTerms },
    safe: [...allowed.map((f) => f.name), ...inMeal.filter((n) => findBannedTerm(n, hard) === null)],
    mealViolation,
  };
};

/** First forbidden term found in `text`, else null. Post-LLM check on replies and recipe steps. */
export const findForbiddenTerm = (text: string, rules: SafetyRules): string | null =>
  findBannedTerm(text, rules.diet, rules.safe);

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
  `I can't suggest ${term} because it doesn't fit your food settings. Ask for another swap and I'll pick something that fits. Always check labels for hidden ingredients.`;
