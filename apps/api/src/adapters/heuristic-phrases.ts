import { DAY_PHRASE, canonicalDay, dayIn, workoutRef } from "../lib/plan-refs";
import type { PlanReviseIntent } from "../ports/plan-reviser";

/**
 * Heuristic plan chat helpers (AMI-173): casual Hinglish rewritten to the English the rules
 * read, and schedule moves by day or by workout name ("move legs to tomorrow").
 */

const VERB_TAIL = "(?:\\s+(?:kar|karo))?(?:\\s+(?:do|de|dena|dijiye|lo|lunga|lungi|denge))?";
const NAME = "([a-z][a-z' ]{1,40}?)";

/** Ordered rewrites; each keeps clause punctuation so the clause split still works. */
const HINGLISH: [RegExp, string][] = [
  [/\b(?:yaar|bhai|please|plz|pls|zara|thoda)\b/g, " "],
  [/\b(?:mera|meri|mere|apna|apni)\b/g, "my"],
  [/\bkal\b/g, "tomorrow"],
  [/\baaj\b/g, "today"],
  [/\bparso\b/g, "day after tomorrow"],
  [/\b(?:zyada|jyada|zyaada)\s+protein\b/g, "more protein"],
  [/\bkam\s+carbs?\b/g, "fewer carbs"],
  [/\b(?:halka|halki|light)\b/g, "lighter"],
  [/\b(?:chhota|chota|chhoti|choti)\b/g, "shorter"],
  [/\b(?:wala|wali|wale)\b/g, " "],
  [new RegExp(`\\b${NAME}\\s+ki\\s+jagah\\s+${NAME}\\s+(?:daal|dal|daalo|dalo|kar|karo|laga|lagao|rakh|rakho|de)${VERB_TAIL}\\b`, "g"), "replace $1 with $2"],
  [new RegExp(`\\b${NAME}\\s+(?:ko\\s+)?(${DAY_PHRASE})\\s+(?:(?:pe|par|ko|tak)\\s+)?(?:shift|move|kar|karo|rakh|rakho)${VERB_TAIL}\\b`, "g"), "move $1 to $2"],
  [new RegExp(`\\b${NAME}\\s+(?:hata|hatao|nikal|nikalo|remove kar|drop kar)${VERB_TAIL}\\b`, "g"), "remove $1"],
  [new RegExp(`\\b${NAME}\\s+add\\s+(?:kar|karo)${VERB_TAIL}\\b`, "g"), "add $1"],
  [/\b(breakfast|lunch|dinner|snacks?)\s+(?:ko\s+)?(?:change|badal|badlo|swap)(?:\s+(?:kar|karo))?(?:\s+(?:do|de|dena|dijiye))?\b/g, "change my $1"],
  [/\b([a-z]+)\s+(?:nahi|nahin|nai|mat)\s+(?:chahiye|khana|khaunga|khaungi|dena|daalo|dalo)\b/g, "no $1"],
  [/\s{2,}/g, " "],
];

/** Lowercased text with common Hinglish phrasings rewritten to English. */
export const englishish = (text: string): string => HINGLISH.reduce((t, [re, to]) => t.replace(re, to), text).trim();

type Move = PlanReviseIntent["scheduleMoves"][number];

const MOVE_VERB = "(move|shift|reschedule|postpone|bump|push back|push)";
const MOVE = new RegExp(
  `\\b${MOVE_VERB}\\s+(?:my\\s+|the\\s+|our\\s+)?([a-z][a-z' ]{0,40}?)\\s+(?:to|till|until|for|on|onto|over to)\\s+(?:the\\s+)?(${DAY_PHRASE})\\b`,
  "g",
);
const DO_INSTEAD = new RegExp(`\\b(?:do|doing|train|hit)\\s+(?:my\\s+|the\\s+)?([a-z][a-z' ]{1,30}?)\\s+(?:on\\s+)?(${DAY_PHRASE})\\s+instead\\b`, "g");
const SWAP_DAYS = new RegExp(`\\b(?:swap|switch)\\s+(?:my\\s+)?(${DAY_PHRASE})(?:'s)?\\s+(?:and|with)\\s+(${DAY_PHRASE})(?:'s)?(?:\\s+(?:workouts?|sessions?))?\\b`, "g");

/** One end of a move: a day inside the phrase wins ("legs from tuesday"), else the workout name. */
const fromRef = (phrase: string, verb: string): string | null => {
  if (/\b(?:breakfast|lunch|dinner|snacks?|meals?)\b/.test(phrase)) return null;
  const day = dayIn(phrase);
  if (day) return day;
  const ref = workoutRef(phrase);
  if (ref) return ref;
  // "push day to friday": the verb ate the workout name; a bare "my workout" means today's.
  if (verb === "push" && /\bday\b/.test(phrase)) return "push";
  return /\b(?:workout|session|training|lift)\b/.test(phrase) ? "today" : null;
};

/** "move legs to tomorrow", "move my upper body workout to next monday", "swap mon and wed". */
export const scheduleMovesFrom = (text: string): Move[] => {
  const out: Move[] = [];
  const push = (from: string | null, to: string | null) => {
    if (from && to && from !== to && !out.some((m) => m.from === from && m.to === to)) out.push({ from, to });
  };
  for (const m of text.matchAll(MOVE)) push(fromRef(m[2]!, m[1]!), canonicalDay(m[3]!));
  for (const m of text.matchAll(DO_INSTEAD)) push(workoutRef(m[1]!), canonicalDay(m[2]!));
  for (const m of text.matchAll(SWAP_DAYS)) push(canonicalDay(m[1]!), canonicalDay(m[2]!));
  return out.slice(0, 3);
};

/** Text spans a schedule move consumed (so "move push to friday" is not read as an exercise edit). */
export const withoutMoves = (text: string): string =>
  text.replace(MOVE, " ").replace(DO_INSTEAD, " ").replace(SWAP_DAYS, " ");
