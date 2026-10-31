/** Scope + safety guard for Chef chat. Pure and deterministic: a hit costs no credits and no LLM call. */

export type GuardKind = "injection" | "medical" | "extreme_diet" | "off_topic";

const COOKING_WORDS =
  /\b(cook|recipe|meal|ingredient|swap|substitut|portion|protein|prep|bake|fry|grill|sauce|spice|flavo|store|reheat|serving|scale|chicken|rice|egg|oil|salt)/i;

const INJECTION =
  /ignore (?:all |any |the |your )?(?:previous|prior|above|earlier)|system prompt|your (?:instructions|rules)|reveal .{0,20}(?:prompt|instructions)|you are now|jailbreak|developer mode|https?:\/\/|<\/?[a-z][^>]*>/i;

const MEDICAL =
  /\b(diagnos|disease|diabet|insulin|medication|medicine|prescri|cure|treatment|symptom|pregnan|eating disorder|cancer|blood pressure|blood sugar|dosage)/i;

const EXTREME_WORDS = /\b(starv|crash diet|detox|cleanse|water fast|fast for \d+)/i;
const DAILY_KCAL =
  /(\d{3,4})\s*(?:k?cal|calories)[^.?!]{0,20}\b(?:a day|per day|daily|all day|total)/i;
/** Neutral floor (no sex input reaches recipe chat). */
const KCAL_FLOOR = 1350;

const OFF_TOPIC =
  /\b(politic|election|president|javascript|python|typescript|code|programming|bitcoin|crypto|stocks?|weather|homework|essay|workout program|training plan|sets and reps|squat|bench press)\b/i;

const REPLIES: Record<GuardKind, string> = {
  injection: "I can only help with this meal. Ask me about cooking, swaps, portions or storage.",
  medical:
    "I can't give medical advice. For health conditions, talk to your doctor or a registered dietitian. I can still help with cooking and portions for this meal.",
  extreme_diet: `I can't help with extreme diets or going below ${KCAL_FLOOR} kcal a day. I can help you make this meal fit your plan instead.`,
  off_topic:
    "I'm your meal chef, so I can't help with that. Ask me about this meal: cooking steps, swaps, portions or storage.",
};

const isExtremeDiet = (message: string): boolean => {
  if (EXTREME_WORDS.test(message)) return true;
  const kcal = DAILY_KCAL.exec(message);
  return kcal !== null && Number(kcal[1]) < KCAL_FLOOR;
};

export const guardMessage = (message: string): { kind: GuardKind; reply: string } | null => {
  const kind: GuardKind | null = INJECTION.test(message)
    ? "injection"
    : MEDICAL.test(message)
      ? "medical"
      : isExtremeDiet(message)
        ? "extreme_diet"
        : OFF_TOPIC.test(message) && !COOKING_WORDS.test(message)
          ? "off_topic"
          : null;
  return kind ? { kind, reply: REPLIES[kind] } : null;
};
