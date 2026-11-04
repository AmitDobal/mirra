/**
 * AMI-184 shame guard for every coach-facing AI reply. Persona harshness may change the energy
 * of a line, never aim at the user's body, worth, effort or setbacks. Two layers:
 *   1. SHAME_PHRASES: words that are an insult in any coach line (substring, case-insensitive).
 *   2. SHAME_PATTERNS: regex families (excuse talk, "you're <insult>", body shaming, guilt).
 * The matching prompt rule is `COACH_TONE_RULE` (contracts, inside `personaPromptBlock`).
 * Pure: no D1, no clock. Food words ("healthy fats", "weak coffee") and lifting words
 * ("push the weak side") are allowed on purpose: the families need the user as the target.
 */

/** Always an insult or guilt line in coach copy. */
export const SHAME_PHRASES = [
  "pathetic", "pitiful", "slacker", "slacking", "slack off", "lazybones", "laziness",
  "act together", "pull yourself together", "disgrace", "shame on", "ashamed", "shameful",
  "done nothing", "did nothing", "regret", "worthless", "useless", "hopeless",
  "loser", "quitter", "weakling", "wimp", "wuss", "sissy", "crybaby", "cry baby", "snowflake",
  "maggot", "couch potato", "sloth", "soggy noodle", "wet noodle", "noodle arm", "spaghetti arm",
  "jelly arm", "man up", "toughen up", "grow a pair", "stop whining", "quit whining",
  "stop crying", "quit crying", "half-assed", "half assed", "zero effort", "embarrassing",
  "embarrassment", "disappointment", "disappointing", "let yourself down", "let me down",
  "flabby", "chubby", "pudgy", "blubber", "fatso", "fatass", "fat ass", "muffin top",
  "love handles", "beer belly", "beer gut", "thunder thighs", "pig out", "pigging out",
  "glutton", "stuffing your face", "disgusting", "ugly", "gross body",
] as const;

type Family = { id: string; re: RegExp };

const YOU = String.raw`\b(?:you(?:'re|’re| are)|u r)\s+(?:so\s+|too\s+|just\s+|being\s+|getting\s+|such\s+|a\s+|an\s+|really\s+|still\s+)*`;

export const SHAME_PATTERNS: readonly Family[] = [
  // Any talk about the user's excuses ("no excuses", "skip the excuses", "your excuse").
  { id: "excuses", re: /\bexcuses\b|\b(?:your|the|an?|that|sad|lame|weak|same|old)\s+excuse\b|\bexcuse[- ]making\b/i },
  // "You're weak / lazy / a joke / out of shape".
  {
    id: "you-insult",
    re: new RegExp(
      `${YOU}(?:weak|lazy|soft|slow|pathetic|useless|hopeless|worthless|fat|heavy|out of shape|a mess|a joke|joke|embarrassing|a disappointment|disappointing|letting (?:me|us|yourself) down|failing|behind again)\\b`,
      "i",
    ),
  },
  // "You've gone soft", "you never finish", "you always quit".
  { id: "you-always", re: /\byou(?:'ve| have)\s+gone\s+soft\b|\byou\s+always\s+(?:quit|skip|give up|bail|flake)|\byou\s+never\s+(?:finish|show up|stick|follow through)/i },
  // Disappointment / guilt aimed at the user.
  { id: "guilt", re: /\b(?:i'?m|i am|so|very|really)\s+disappointed\b|\bdisappointed in you\b|\bshould be ashamed\b/i },
  // Name-calling with "weak"/"soft" as an adjective of the person or effort.
  { id: "weak-effort", re: /\bweak\s+(?:effort|sauce|excuse|attempt|showing|performance|willpower)\b|\bsoft\s+(?:effort|excuse)\b/i },
  // Body shaming the phrase list misses ("your flab", "that belly fat", "jiggly").
  { id: "body", re: /\b(?:your|that)\s+(?:flab|belly fat|jiggle)\b|\bjiggl(?:e|y|ing)\b/i },
] as const;

const escape = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Word-bounded, plural ok ("noodle arms", "slackers"). */
const PHRASE_RES = SHAME_PHRASES.map((w) => [w, new RegExp(`\\b${escape(w)}(?:e?s)?\\b`, "i")] as const);

/** Shame phrases + regex family ids found in `text` (empty when clean). */
export const findShameHits = (text: string): string[] => {
  const words = PHRASE_RES.filter(([, re]) => re.test(text)).map(([w]) => w);
  const families = SHAME_PATTERNS.filter((f) => f.re.test(text)).map((f) => `/${f.id}/`);
  return [...words, ...families];
};
