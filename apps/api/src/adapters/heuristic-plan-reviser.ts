import type { MealSlot, TrainerPersona } from "@mirra/contracts";

import { emptyIntent, hasAnyIntent, sanitizeIntent } from "../lib/plan-intent";
import { parseByClause, unmappedWarnings } from "../lib/plan-intent-clauses";
import type { PlanReviseIntent, PlanReviseMealBias, PlanReviser, PlanReviseResult } from "../ports/plan-reviser";

const REPLY_LEADS: Record<TrainerPersona, string> = {
  drill: "Done, recruit. Now",
  honey: "Of course, sweet one. I am",
  wit: "Fine, I will be",
  spark: "On it! Now",
  zen: "Understood. Gently",
  rival: "Locked in. I am",
};

const NEG = "(?:no|without|not|don'?t|doesn'?t|can'?t|cannot|never|avoid|skip|unavailable|remove|ditch|drop|hate)";
const GEAR: Record<string, string> = {
  cables: "cables?",
  machines: "machines?",
  barbell: "barbells?|barbell",
  bands: "bands?|resistance bands?",
  dumbbells: "dumbbells?",
};
const FOODS = [
  "dairy", "milk", "cheese", "lactose", "chicken", "eggs", "egg", "fish", "seafood", "shellfish",
  "shrimp", "nuts", "peanuts", "gluten", "wheat", "soy", "beef", "turkey", "pork", "meat",
];

/** Spoken names → cuisine ids. */
const CUISINES: Record<string, string> = {
  indian: "indian",
  american: "american",
  chinese: "chinese",
  japanese: "japanese",
  mediterranean: "mediterranean",
  greek: "mediterranean",
  italian: "mediterranean",
  mexican: "mexican",
  "middle eastern": "middle_eastern",
  korean: "korean",
  thai: "thai",
};
const CUISINE_WORDS = Object.keys(CUISINES).join("|");

const negated = (text: string, words: string): boolean =>
  new RegExp(`\\b${NEG}\\b[^.,;!?]{0,25}\\b(?:${words})\\b`).test(text) ||
  new RegExp(`\\b(?:${words})\\b[^.,;!?]{0,20}\\b(?:unavailable|broken|taken|busy|out of order|not available)`).test(text);

const shortenFrom = (text: string): number | undefined => {
  const num = /(\d{2})\s*[- ]?\s*(?:min|mins|minutes)\b/.exec(text);
  if (num) return Number(num[1]);
  if (/\b(shorter|short session|quick|express|less time|cut it down)\b/.test(text)) return 30;
  return undefined;
};

const COUNT_WORDS: Record<string, number> = {
  one: 1, once: 1, two: 2, twice: 2, three: 3, thrice: 3, four: 4, "1": 1, "2": 2, "3": 3, "4": 4,
};
const COUNT = "one|once|two|twice|three|thrice|four|[1-4]";
const EAT_CUE = /\b(?:eat|eating|ate|meals?|food|feed|fed|diet|lunch|dinner|breakfast|snacks?)\b/;

/** "I only eat two times a day", "3 meals a day", "just 2 meals". */
const mealsPerDayFrom = (text: string): number | undefined => {
  if (!EAT_CUE.test(text)) return undefined;
  const perDay = new RegExp(`\\b(${COUNT})\\s*(?:x|times?|meals?)?(?:\\s*(?:a|per|each|every)\\s+|\\s*/\\s*)day\\b`).exec(text);
  const only = new RegExp(`\\b(?:to|only|just|have|eat|down to)\\s+(${COUNT})\\s+meals?\\b`).exec(text);
  const hit = perDay?.[1] ?? only?.[1];
  return hit ? COUNT_WORDS[hit] : undefined;
};

const SLOT_WORD = /\b(breakfast|lunch|dinner|snacks?)\b/;
const BIAS_WORDS = /\b(?:protein|carbs?|lighter|smaller|calories|less heavy)\b/;
const NOT_EXERCISE = new RegExp(
  `\\b(?:${[...FOODS, "breakfast", "lunch", "dinner", "snacks?", "meals?", "food", "protein", "carbs?", "calories", "kcal", "dairy", "gym", "cables?", "machines?", "barbells?", "dumbbells?", "bands?", "equipment", "workout", "session", "day", "minutes?", "more", "veg[a-z]*", "fruits?", "water", "salt", "sugar", "spic[a-z]*", "rice", "salad", "sauce", "something"].join("|")})\\b`,
);
/** A captured name may not run across a clause join or a second edit verb. */
const NO_JOIN = "(?!\\b(?:and|then|also|replace|swap)\\b)";
const DAY = "(mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?|sun)(?:day)?";
const exerciseLike = (s: string | undefined): s is string =>
  s != null && s.trim().length >= 3 && s.trim().split(/\s+/).length <= 5 && !NOT_EXERCISE.test(s);
const tidy = (s: string): string => s.replace(/^(?:my|the|a|an|some)\s+/, "").replace(/\s+(?:please|today|instead)$/, "").trim();

type V2Pieces = Pick<PlanReviseIntent, "mealSlots" | "mealBias" | "exerciseSwaps" | "exerciseAdds" | "exerciseRemoves" | "scheduleMoves">;

/** v2 regexes (arch §8.4): slot swaps, macro bias, named exercise edits, day moves. */
const v2From = (text: string): V2Pieces => {
  const slot = new RegExp(`\\b(?:swap|change|replace|switch|redo|new|different)\\s+(?:out\\s+)?(?:my\\s+|the\\s+|today'?s\\s+)?${SLOT_WORD.source}|${SLOT_WORD.source}\\s+(?:swap|change)\\b`, "g");
  const biased = new RegExp(`\\b(?:make|keep|give me)\\s+(?:my\\s+|the\\s+|today'?s\\s+)?${SLOT_WORD.source}`, "g");
  const mealSlots = [...text.matchAll(slot), ...(BIAS_WORDS.test(text) ? text.matchAll(biased) : [])]
    .map((m) => (m[1] ?? m[2])!.replace(/s$/, "") as MealSlot)
    .filter((v, i, xs) => xs.indexOf(v) === i);
  const mealBias: PlanReviseMealBias | undefined =
    /\b(?:more|extra|higher|high|bigger)[- ]protein\b|\bprotein[- ](?:heavy|rich|packed)\b/.test(text)
      ? "high_protein"
      : /\b(?:less|fewer|lower|low)[- ]carbs?\b/.test(text)
        ? "low_carb"
        : /\b(?:lighter|smaller|fewer calories|less heavy)\b/.test(text)
          ? "lighter"
          : undefined;
  const exerciseSwaps = [...text.matchAll(new RegExp(`\\b(?:replace|swap)\\s+(?:out\\s+)?([a-z](?:${NO_JOIN}[a-z' -]){2,40}?)\\s+(?:with|for)\\s+([a-z][a-z' -]{2,40}?)(?=[.,;!?]|\\s+(?:and|then|also)\\b|$)`, "g"))]
    .map((m) => ({ from: tidy(m[1]!), to: tidy(m[2]!) }))
    .filter((sw) => exerciseLike(sw.from) && !SLOT_WORD.test(sw.from))
    .map((sw) => ({ from: sw.from, to: exerciseLike(sw.to) && !/\bsomething\b/.test(sw.to) ? sw.to : null }));
  const exerciseAdds = [...text.matchAll(/\badd\s+([a-z][a-z' -]{2,40}?)(?:\s+to\s+(?:my\s+|the\s+)?[a-z ]{0,20})?(?=[.,;!?]|$)/g)]
    .map((m) => tidy(m[1]!))
    .filter(exerciseLike)
    .map((name) => ({ name }));
  const exerciseRemoves = [...text.matchAll(/\b(?:drop|remove|cut|skip)\s+(?:the\s+|my\s+)?([a-z][a-z' -]{2,40}?)(?=[.,;!?]|\s+from\b|$)/g)]
    .map((m) => tidy(m[1]!))
    .filter(exerciseLike);
  const scheduleMoves = [...text.matchAll(new RegExp(`\\bmove\\s+(?:my\\s+)?${DAY}(?:'s)?\\s+(?:workout|session|lift|training)\\s+to\\s+${DAY}\\b`, "g"))]
    .map((m) => ({ from: m[0]!.split(/\s+/).find((w) => new RegExp(`^${DAY}`).test(w))!.replace(/'s$/, ""), to: m[0]!.split(/\s+/).at(-1)! }));
  return { mealSlots, ...(mealBias ? { mealBias } : {}), exerciseSwaps, exerciseAdds, exerciseRemoves, scheduleMoves };
};

/** Rules for one piece of text (whole message or one clause): sanitized intent. */
const parseRules = (text: string): PlanReviseIntent => {
  const intent = emptyIntent();

  // Equipment unavailable.
  for (const [id, words] of Object.entries(GEAR)) {
    if (negated(text, words)) intent.equipmentRemove.push(id);
  }
  if (/\b(?:only|just)\s+(?:the\s+)?dumbbells?\b|\bdumbbells?\s+only\b/.test(text)) {
    intent.equipmentRemove.push("machines", "cables", "barbell", "bands");
    intent.equipmentAdd.push("dumbbells");
  }
  if (/\b(?:only|just)\s+bodyweight\b|\bbodyweight\s+only\b|\bno equipment\b/.test(text)) {
    intent.equipmentRemove.push("machines", "cables", "barbell", "dumbbells", "bands");
    intent.equipmentAdd.push("bodyweight");
  }
  if (/\b(?:no|without)\s+(?:a\s+)?(?:gym|gym access)\b/.test(text)) {
    intent.equipmentRemove.push("full_gym", "machines", "cables");
  }

  // Preferences.
  if (/\b(prefer|want|more|use|do|favou?r|focus on)\b[^.,;]{0,20}\bbench\b|\bbench press\b/.test(text) && !negated(text, "bench")) {
    intent.preferBench = true;
    intent.equipmentAdd.push("bench");
  }
  if (/\b(prefer|want|more|use|favou?r)\b[^.,;]{0,15}\bdumbbells?\b/.test(text)) {
    intent.equipmentAdd.push("dumbbells");
  }
  if (/\b(prefer|want|more|use|favou?r)\b[^.,;]{0,15}\bmachines?\b/.test(text) && !negated(text, GEAR.machines!)) {
    intent.equipmentAdd.push("machines");
    intent.equipmentRemove = intent.equipmentRemove.filter((e) => e !== "machines");
  }

  // Food.
  const cue = `(?:${NEG}|allergic to|allergy|intolerant|cut out|lactose)`;
  for (const f of FOODS) {
    const near = new RegExp(`\\b${cue}\\b[^.,;!?]{0,40}\\b${f}\\b|\\b${f}\\b[^.;!?]{0,12}\\b(?:allergy|intolerant)\\b`);
    if (near.test(text)) intent.foodsAvoidAdd.push(f === "lactose" ? "dairy" : f);
  }
  if (/\bvegan\b/.test(text)) intent.dietTagsAdd.push("vegan");
  else if (/\b(vegetarian|veggie|veg)\b/.test(text)) intent.dietTagsAdd.push("vegetarian");
  if (/\bdairy[- ]free\b/.test(text)) intent.dietTagsAdd.push("dairy_free");
  if (/\bgluten[- ]free\b/.test(text)) intent.dietTagsAdd.push("gluten_free");
  const cuisineHits = [...text.matchAll(new RegExp(`\\b(${CUISINE_WORDS})\\b`, "g"))]
    .filter((m) => !new RegExp(`\\b${NEG}\\b[^.,;!?]{0,12}\\b${m[1]}\\b`).test(text))
    .map((m) => CUISINES[m[1]!]!);
  if (cuisineHits.length > 0 && /\b(food|foods|meals?|cuisine|cooking|eat|eating|diet|dishes|only|prefer|want|more|switch|just)\b/.test(text)) {
    intent.cuisineStylesAdd.push(...cuisineHits);
    if (/\b(only|just|exclusively|switch to|nothing but)\b/.test(text)) intent.cuisineStylesOnly = true;
    intent.forceMealRegen = true;
  }
  if (/\b(regenerate|regen|redo|new|different|fresh|rebuild)\b[^.,;]{0,15}\b(meals?|meal plan|food|diet)\b/.test(text)) {
    intent.forceMealRegen = true;
  }

  const mealsPerDay = mealsPerDayFrom(text);
  if (mealsPerDay) {
    intent.mealsPerDay = mealsPerDay;
  }

  const v2 = v2From(text);
  Object.assign(intent, v2);
  // "more protein in my meals" (no slot named): whole-day redraft with the bias.
  if (v2.mealBias && v2.mealSlots.length === 0 && /\b(?:meals?|food|diet|eat)\b/.test(text)) {
    intent.forceMealRegen = true;
  }

  // Session length.
  intent.shortenMin = shortenFrom(text);
  if (/\b(workout|exercise|routine|session|lift)\b[^.,;]{0,15}\b(change|swap|new|different)\b|\b(change|swap|new|different)\b[^.,;]{0,15}\b(workout|exercise|routine|session|lift)\b/.test(text)) {
    intent.reviseWorkout = true;
  }

  const clean = sanitizeIntent(intent);
  const exerciseEdits = clean.exerciseSwaps.length + clean.exerciseAdds.length + clean.exerciseRemoves.length;
  if (clean.equipmentRemove.length || clean.equipmentAdd.length || clean.preferBench || clean.shortenMin || exerciseEdits) {
    clean.reviseWorkout = true;
  }
  return clean;
};

/** Keyword/rule reviser — deterministic, no keys needed. */
export const heuristicPlanReviser: PlanReviser = {
  propose: async (input): Promise<PlanReviseResult> => {
    // iOS keyboards send curly apostrophes ("Thursday’s workout").
    const text = input.message.toLowerCase().replace(/[‘’]/g, "'").replace(/cable machines?/g, "cables");
    // Multi-intent messages: every clause is parsed too, so no part is silently dropped.
    const { intent: clean, unmapped } = parseByClause(text, parseRules);
    const notes: string[] = [];

    if (clean.equipmentRemove.length) notes.push(`dropping ${clean.equipmentRemove.join(", ")}`);
    if (clean.preferBench) notes.push("favouring bench press");
    if (clean.equipmentAdd.some((e) => e !== "bench")) notes.push(`using ${clean.equipmentAdd.filter((e) => e !== "bench").join(", ")}`);
    if (clean.shortenMin) notes.push(`capping the session at ${clean.shortenMin} min`);
    if (clean.foodsAvoidAdd.length) notes.push(`removing ${clean.foodsAvoidAdd.join(", ")} from meals`);
    if (clean.dietTagsAdd.length) notes.push(`switching meals to ${clean.dietTagsAdd.join(", ").replace(/_/g, " ")}`);
    if (clean.cuisineStylesAdd.length) notes.push(`${clean.cuisineStylesOnly ? "only " : "adding "}${clean.cuisineStylesAdd.join(", ").replace(/_/g, " ")} food`);
    if (clean.mealSlots.length) {
      const bias = clean.mealBias ? ` for ${clean.mealBias.replace(/_/g, " ")}` : "";
      notes.push(`swapping your ${clean.mealSlots.join(" and ")}${bias}`);
    }
    if (clean.exerciseSwaps.length) notes.push(`swapping ${clean.exerciseSwaps.map((s) => s.from).join(", ")}`);
    if (clean.exerciseAdds.length) notes.push(`adding ${clean.exerciseAdds.map((a) => a.name).join(", ")}`);
    if (clean.exerciseRemoves.length) notes.push(`dropping ${clean.exerciseRemoves.join(", ")}`);
    if (clean.scheduleMoves.length) notes.push(`moving ${clean.scheduleMoves.map((m) => `${m.from} to ${m.to}`).join(", ")}`);
    if (clean.mealsPerDay) notes.push(`planning ${clean.mealsPerDay} meal${clean.mealsPerDay === 1 ? "" : "s"} a day`);
    if (clean.forceMealRegen && !clean.mealsPerDay && !clean.foodsAvoidAdd.length && !clean.dietTagsAdd.length && !clean.cuisineStylesAdd.length) notes.push("rebuilding today's meals");

    if (!hasAnyIntent(clean)) {
      return {
        intent: clean,
        reply:
          "I couldn't map that to a plan change. Try: \"no cable machines\", \"prefer bench press\", \"no dairy\", \"I eat two meals a day\" or \"shorter session\".",
        warnings: ["No actionable change detected"],
        source: "heuristic",
      };
    }
    const reply = `${REPLY_LEADS[input.persona ?? "drill"]} ${notes.join(", ")}.`;
    return { intent: clean, reply, warnings: unmappedWarnings(unmapped), source: "heuristic" };
  },
};
