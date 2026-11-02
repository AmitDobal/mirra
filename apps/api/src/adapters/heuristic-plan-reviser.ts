import type { TrainerPersona } from "@mirra/contracts";

import { emptyIntent, hasAnyIntent, sanitizeIntent } from "../lib/plan-intent";
import type { PlanReviser, PlanReviseResult } from "../ports/plan-reviser";

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

/** Keyword/rule reviser — deterministic, no keys needed. */
export const heuristicPlanReviser: PlanReviser = {
  propose: async (input): Promise<PlanReviseResult> => {
    const text = input.message.toLowerCase().replace(/cable machines?/g, "cables");
    const intent = emptyIntent();
    const notes: string[] = [];

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

    // Session length.
    intent.shortenMin = shortenFrom(text);
    if (/\b(workout|exercise|routine|session|lift)\b[^.,;]{0,15}\b(change|swap|new|different)\b|\b(change|swap|new|different)\b[^.,;]{0,15}\b(workout|exercise|routine|session|lift)\b/.test(text)) {
      intent.reviseWorkout = true;
    }

    const clean = sanitizeIntent(intent);
    if (clean.equipmentRemove.length || clean.equipmentAdd.length || clean.preferBench || clean.shortenMin) {
      clean.reviseWorkout = true;
    }

    if (clean.equipmentRemove.length) notes.push(`dropping ${clean.equipmentRemove.join(", ")}`);
    if (clean.preferBench) notes.push("favouring bench press");
    if (clean.equipmentAdd.some((e) => e !== "bench")) notes.push(`using ${clean.equipmentAdd.filter((e) => e !== "bench").join(", ")}`);
    if (clean.shortenMin) notes.push(`capping the session at ${clean.shortenMin} min`);
    if (clean.foodsAvoidAdd.length) notes.push(`removing ${clean.foodsAvoidAdd.join(", ")} from meals`);
    if (clean.dietTagsAdd.length) notes.push(`switching meals to ${clean.dietTagsAdd.join(", ").replace(/_/g, " ")}`);
    if (clean.cuisineStylesAdd.length) notes.push(`${clean.cuisineStylesOnly ? "only " : "adding "}${clean.cuisineStylesAdd.join(", ").replace(/_/g, " ")} food`);
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
    return { intent: clean, reply, warnings: [], source: "heuristic" };
  },
};
