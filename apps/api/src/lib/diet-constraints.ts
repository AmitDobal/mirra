/**
 * AMI-199: THE dietary constraint resolver. Pure and deterministic.
 *
 * Inputs are explicit settings only: diet tags, the free-text avoid list, cuisine picks (cultural
 * defaults, see `CUISINE_DEFAULTS`) and the profile timezone (`TIMEZONE_DEFAULTS`). Religion is
 * never inferred from a name. Every meal path uses the result twice: before generation (catalog
 * filter + prompt "never include" list) and after it (`diet-guard.ts` validates every meal).
 */
import type { VettedFood } from "../data/vetted-foods";
import {
  AVOID_WORD_GROUPS,
  CUISINE_DEFAULTS,
  DIET_GROUPS,
  DIET_RULES,
  SAFE_QUALIFIERS,
  TIMEZONE_DEFAULTS,
  type DietGroupId,
} from "./diet-terms";
import { effectiveCuisines } from "./meal-cuisine";

export type DietInput = {
  dietTags: readonly string[];
  foodsAvoid?: string | null;
  cuisineStyles: readonly string[];
  /** Lifestyle notes: cuisine hints when the user picked "other". */
  hintText?: string | null;
  /** Profile timezone (IANA). */
  timezone?: string | null;
};

export type DietConstraints = {
  groups: DietGroupId[];
  /** Catalog tags no food may carry. */
  bannedTags: string[];
  /** Raw avoid-list words (3+ letters, lowercased) matched against food names. */
  avoidWords: string[];
  /** Lowercase words/phrases that must never appear in a title, recipe or reply. */
  terms: string[];
  /** Banned unless a safe protein word sits right before them ("chicken burger"). */
  qualified: string[];
  /** Why each group applies: "diet:vegetarian", "cuisine:indian", "timezone:Asia/Kolkata", "avoid:beef". */
  sources: string[];
};

export const NO_DIET_CONSTRAINTS: DietConstraints = {
  groups: [],
  bannedTags: [],
  avoidWords: [],
  terms: [],
  qualified: [],
  sources: [],
};

/** Avoid-list filler that must never become a text ban ("no nuts and dairy" → not "and"). */
const STOP_WORDS = new Set([
  "and", "the", "any", "all", "not", "food", "foods", "with", "without", "please", "very", "much", "too",
  "also", "but", "for", "like", "dont", "don", "can", "cant", "eat", "allergic", "allergy", "free", "red",
  "only", "some", "really", "hate", "avoid", "none", "other", "stuff", "kind", "kinds", "type", "types",
]);

/** Common phrases that hold a banned word but are not that food: phrase → words it clears. */
const SAFE_PHRASES: Readonly<Record<string, readonly string[]>> = {
  "peanut butter": ["butter"],
  "almond butter": ["butter"],
  "nut butter": ["butter"],
  "cocoa butter": ["butter"],
  "coconut milk": ["milk"],
  "almond milk": ["milk"],
  "soy milk": ["milk"],
  "oat milk": ["milk"],
  "rice milk": ["milk"],
  "egg-free": ["egg"],
  "dairy-free": ["dairy"],
  "gluten-free": ["gluten"],
  "nut-free": ["nut"],
  "meat-free": ["meat"],
  "plant-based meat": ["meat"],
  "beef-free": ["beef"],
  "pork-free": ["pork"],
};

const tokens = (text: string | null | undefined): string[] =>
  (text ?? "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t.length >= 3);

const singular = (w: string): string => (w.endsWith("s") && w.length > 3 ? w.slice(0, -1) : w);

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const termRe = (term: string): RegExp => new RegExp(`\\b${escapeRe(term)}(?:s|es)?\\b`, "i");

export const resolveDietConstraints = (input: DietInput): DietConstraints => {
  const groups = new Set<DietGroupId>();
  const sources: string[] = [];
  const add = (ids: readonly DietGroupId[] | undefined, source: string) => {
    if (!ids || ids.length === 0) return;
    for (const g of ids) groups.add(g);
    sources.push(source);
  };
  for (const d of input.dietTags) add(DIET_RULES[d.trim().toLowerCase()], `diet:${d}`);
  for (const c of effectiveCuisines(input.cuisineStyles, input.hintText)) add(CUISINE_DEFAULTS[c], `cuisine:${c}`);
  if (input.timezone) add(TIMEZONE_DEFAULTS[input.timezone], `timezone:${input.timezone}`);

  const avoidWords = tokens(input.foodsAvoid);
  for (const w of avoidWords) add(AVOID_WORD_GROUPS[w] ?? AVOID_WORD_GROUPS[singular(w)], `avoid:${w}`);

  const sorted = [...groups].sort();
  const bannedTags = new Set<string>();
  const terms = new Set<string>();
  const qualified = new Set<string>();
  for (const g of sorted) {
    const group = DIET_GROUPS[g];
    for (const t of group.tags) bannedTags.add(t);
    for (const t of group.terms) terms.add(t);
    for (const t of "qualified" in group ? group.qualified : []) qualified.add(t);
  }
  for (const w of avoidWords) if (!STOP_WORDS.has(w)) terms.add(singular(w));
  return {
    groups: sorted,
    bannedTags: [...bannedTags].sort(),
    avoidWords,
    terms: [...terms],
    qualified: [...qualified],
    sources: [...new Set(sources)],
  };
};

export const hasConstraints = (c: DietConstraints): boolean => c.groups.length > 0 || c.avoidWords.length > 0;

/** Catalog check: banned tag, avoid word in the name/id, or a beef/pork word in the name. */
export const foodBannedBy = (food: VettedFood, c: DietConstraints): string | null => {
  const tag = food.tags.find((t) => c.bannedTags.includes(t));
  if (tag) return `tag:${tag}`;
  const haystack = `${food.id.replace(/_/g, " ")} ${food.name.toLowerCase()}`;
  const word = c.avoidWords.find((w) => haystack.includes(singular(w)));
  if (word) return `avoid:${word}`;
  for (const g of c.groups) {
    if (g !== "beef" && g !== "pork") continue;
    const hit = DIET_GROUPS[g].terms.find((t) => termRe(t).test(food.name));
    if (hit) return `name:${hit}`;
  }
  return null;
};

/**
 * Blank out phrases that clear `term` before scanning: `safe` (allowed catalog names, which the
 * tag filter already vetted) clears every term; `SAFE_PHRASES` clear only their listed words.
 */
const maskedFor = (text: string, term: string, safe: readonly string[]): string => {
  const phrases = [
    ...safe.map((s) => s.toLowerCase()),
    ...Object.entries(SAFE_PHRASES)
      .filter(([, words]) => words.includes(term))
      .map(([p]) => p),
  ].sort((a, b) => b.length - a.length);
  let out = ` ${text.toLowerCase()} `;
  for (const p of phrases) if (p) out = out.split(p).join(" ");
  return out;
};

const PREV_WORDS = /([a-z-]+)\s+(?:([a-z-]+)\s+)?$/;

const qualifiedHit = (text: string, word: string): boolean => {
  const re = new RegExp(`\\b${escapeRe(word)}(?:s|es)?\\b`, "gi");
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const prev = PREV_WORDS.exec(text.slice(0, m.index));
    const near = prev ? [prev[1], prev[2]].filter(Boolean) : [];
    if (!near.some((w) => SAFE_QUALIFIERS.includes(w!))) return true;
  }
  return false;
};

/**
 * First banned word/phrase in free text (titles, recipe steps, chef and coach replies), else null.
 * `safe` = phrases known to be fine for this user (e.g. names of allowed catalog foods).
 */
export const findBannedTerm = (
  text: string | null | undefined,
  c: DietConstraints,
  safe: readonly string[] = [],
): string | null => {
  if (!text || (c.terms.length === 0 && c.qualified.length === 0)) return null;
  const plain = text.toLowerCase();
  for (const t of c.terms) {
    if (termRe(t).test(plain) && termRe(t).test(maskedFor(text, t, safe))) return t;
  }
  for (const q of c.qualified) {
    if (termRe(q).test(plain) && qualifiedHit(maskedFor(text, q, safe), q)) return q;
  }
  return null;
};

/** Religion-sensitive groups: never exempted, not even for items already in a planned meal. */
export const HARD_GROUPS: readonly DietGroupId[] = ["beef", "pork"];

/** Only the beef/pork part of `c` (empty when neither applies). */
export const hardPartOf = (c: DietConstraints): DietConstraints => {
  const groups = c.groups.filter((g) => HARD_GROUPS.includes(g));
  const terms = new Set<string>();
  const qualified = new Set<string>();
  for (const g of groups) {
    const group = DIET_GROUPS[g];
    for (const t of group.terms) terms.add(t);
    for (const t of "qualified" in group ? group.qualified : []) qualified.add(t);
  }
  return { ...NO_DIET_CONSTRAINTS, groups, terms: [...terms], qualified: [...qualified], sources: c.sources };
};

/** Prompt lines: what the model must never include (group labels + the avoid list). */
export const neverIncludeList = (c: DietConstraints): string[] => {
  const labels = c.groups.map((g) => {
    const group = DIET_GROUPS[g];
    const examples = group.terms.filter((t) => t !== group.label).slice(0, 6);
    return examples.length > 0 ? `${group.label} (incl. ${examples.join(", ")})` : group.label;
  });
  const words = c.avoidWords.filter((w) => !STOP_WORDS.has(w));
  return [...new Set([...labels, ...words])].slice(0, 24);
};
