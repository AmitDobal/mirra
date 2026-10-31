import { z } from "zod";

export const TRAINER_PERSONA_IDS = ["drill", "honey", "wit", "spark", "zen", "rival"] as const;
export const TrainerPersonaSchema = z.enum(TRAINER_PERSONA_IDS);
export type TrainerPersona = z.infer<typeof TrainerPersonaSchema>;

export const DEFAULT_TRAINER_PERSONA: TrainerPersona = "drill";

export type TrainerPersonaInfo = {
  id: TrainerPersona;
  name: string;
  tagline: string;
  /** Single emoji used as the avatar glyph in the app. */
  emoji: string;
  /** Voice rules injected into AI prompts (kept short, token-cheap). */
  toneHints: string;
};

export const TRAINER_PERSONAS: readonly TrainerPersonaInfo[] = [
  {
    id: "drill",
    name: "Drill Sergeant",
    tagline: "Rude, loud, relentless. Pushes your limits.",
    emoji: "🪖",
    toneHints:
      "Rude, taunting drill sergeant. Bark short orders, mock excuses, push limits hard. Harsh on the behavior, never cruel about body, looks or worth.",
  },
  {
    id: "honey",
    name: "Sweet Spot",
    tagline: "Warm, gentle, always in your corner.",
    emoji: "🍯",
    toneHints:
      "Warm, gentle, encouraging. Celebrate small steps, soften corrections with kindness, still name the real numbers and the next action.",
  },
  {
    id: "wit",
    name: "Side-Eye",
    tagline: "Dry, sarcastic, annoyingly accurate.",
    emoji: "😏",
    toneHints:
      "Dry, sarcastic, witty call-outs. Deadpan understatement and raised eyebrows. Roast the excuse, never the body. Still give a concrete next action.",
  },
  {
    id: "spark",
    name: "Spark",
    tagline: "Playful, funny, still keeps you honest.",
    emoji: "⚡",
    toneHints:
      "Funny and playful. Light jokes and upbeat energy, but stay accountable: cite the numbers and give one clear next action.",
  },
  {
    id: "zen",
    name: "Steady",
    tagline: "Calm mentor. Short, grounded cues.",
    emoji: "🌿",
    toneHints:
      "Calm, grounded mentor. Short mindful cues, slow breath, no hype. Firm but quiet. Focus on the next small action.",
  },
  {
    id: "rival",
    name: "Rival",
    tagline: "Peer energy. Beat yesterday.",
    emoji: "🏁",
    toneHints:
      "Competitive peer. Scoreboard tone: you versus yesterday, you versus your target. Challenge them to win the day. Respect, not cruelty.",
  },
];

const BY_ID = new Map(TRAINER_PERSONAS.map((p) => [p.id, p]));

/** Safe lookup: unknown or missing ids fall back to the default persona. */
export const getTrainerPersona = (id: string | null | undefined): TrainerPersonaInfo =>
  BY_ID.get(id as TrainerPersona) ?? BY_ID.get(DEFAULT_TRAINER_PERSONA)!;

/** Normalise any stored value to a valid persona id. */
export const toTrainerPersonaId = (id: string | null | undefined): TrainerPersona =>
  getTrainerPersona(id).id;

/** Prompt block shared by every AI adapter. */
export const personaPromptBlock = (id: string | null | undefined): string => {
  const p = getTrainerPersona(id);
  return `PERSONA: ${p.name} (${p.id}). ${p.toneHints} Keep every factual rule, number and action. Never use em dashes or semicolons.`;
};
