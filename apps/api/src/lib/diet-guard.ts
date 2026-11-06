/**
 * AMI-199: post-generation diet guard. Every drafted meal (OpenAI, heuristic, plan chat, swap,
 * rebalance, data fix) passes through `guardMealDraft` before it is stored. Pure apart from the
 * `[diet-guard]` log line.
 */
import type { MealSlot } from "@mirra/contracts";

import { FOODS_BY_ID } from "../data/vetted-foods";
import { findBannedTerm, foodBannedBy, type DietConstraints } from "./diet-constraints";

export type GuardableMeal = {
  slot: MealSlot;
  title: string;
  items: { foodId: string; grams: number }[];
};

export type GuardResult<T extends GuardableMeal> = {
  /** Null when no allowed item is left (the caller re-drafts the slot). */
  meal: T | null;
  fixes: string[];
};

const lowerFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);

/** "Chicken breast with rice, broccoli & olive oil" from catalog names. */
export const titleForNames = (names: readonly string[]): string => {
  if (names.length === 0) return "Planned meal";
  if (names.length === 1) return names[0]!;
  const rest = names.slice(1).map(lowerFirst);
  return `${names[0]} with ${rest.length > 1 ? `${rest.slice(0, -1).join(", ")} & ${rest.at(-1)}` : rest[0]}`;
};

export const logDietGuard = (where: string, detail: Record<string, unknown>): void => {
  console.warn(`[diet-guard] ${where}`, JSON.stringify(detail));
};

/** Drop banned or unknown items; rewrite a title that names a banned food. */
export const guardMealDraft = <T extends GuardableMeal>(meal: T, c: DietConstraints): GuardResult<T> => {
  const fixes: string[] = [];
  const items = meal.items.filter((it) => {
    const food = FOODS_BY_ID.get(it.foodId);
    const why = food ? foodBannedBy(food, c) : "unknown_food";
    if (why) fixes.push(`${meal.slot}: dropped ${it.foodId} (${why})`);
    return why === null;
  });
  // A dish that held a banned food is not "the same dish minus beef": reject it so the slot is
  // re-drafted from the allowed catalog (keeps a real protein in the meal).
  if (items.length !== meal.items.length) return { meal: null, fixes: [...fixes, `${meal.slot}: re-draft`] };
  const names = items.map((it) => FOODS_BY_ID.get(it.foodId)!.name);
  let title = meal.title;
  const bad = findBannedTerm(title, c, names);
  if (bad) {
    fixes.push(`${meal.slot}: title named "${bad}"`);
    title = titleForNames(names);
  }
  return { meal: { ...meal, items, title }, fixes };
};

/** Guard a batch; logs once per batch with the constraint sources (never user free text). */
export const guardMealDrafts = <T extends GuardableMeal>(
  meals: readonly T[],
  c: DietConstraints,
  where: string,
): T[] => {
  const out: T[] = [];
  const fixes: string[] = [];
  for (const m of meals) {
    const r = guardMealDraft(m, c);
    fixes.push(...r.fixes);
    if (r.meal) out.push(r.meal);
  }
  if (fixes.length > 0) logDietGuard(where, { fixes: fixes.slice(0, 12), groups: c.groups, sources: [...new Set(c.sources.map((s) => (s.startsWith("avoid:") ? "avoid" : s)))] });
  return out;
};
