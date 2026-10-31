/** Trainer characters. Ids and names mirror `packages/contracts/src/trainer-persona.ts`. */
export type TrainerPersonaId = "drill" | "honey" | "wit" | "spark" | "zen" | "rival";

export type TrainerPersonaOption = {
  readonly id: TrainerPersonaId;
  readonly name: string;
  readonly tagline: string;
  /** Accent dot on S09B cards (hex from Stitch Kinetic). */
  readonly accent: string;
  /** One-line coach sample for the voice preview strip. */
  readonly sampleLine: string;
  /** Legacy glyph — UI uses Stitch portraits, not emoji. */
  readonly emoji: string;
};

export const DEFAULT_TRAINER_PERSONA: TrainerPersonaId = "drill";

export const TRAINER_PERSONA_OPTIONS: readonly TrainerPersonaOption[] = [
  {
    id: "drill",
    name: "Drill Sergeant",
    tagline: "Rude, loud, relentless. Pushes your limits.",
    accent: "#EF4444",
    sampleLine: "Drop and give me twenty. Now.",
    emoji: "🪖",
  },
  {
    id: "honey",
    name: "Sweet Spot",
    tagline: "Warm, gentle, always in your corner.",
    accent: "#22C55E",
    sampleLine: "You're doing great. One more set, softly.",
    emoji: "🍯",
  },
  {
    id: "wit",
    name: "Side-Eye",
    tagline: "Dry, sarcastic, annoyingly accurate.",
    accent: "#EAB308",
    sampleLine: "You're really resting that long? Okay.",
    emoji: "😏",
  },
  {
    id: "spark",
    name: "Spark",
    tagline: "Playful, funny, still keeps you honest.",
    accent: "#F97316",
    sampleLine: "Plot twist: that was the warm-up. Let's go!",
    emoji: "⚡",
  },
  {
    id: "zen",
    name: "Steady",
    tagline: "Calm mentor. Short, grounded cues.",
    accent: "#3B82F6",
    sampleLine: "Breathe. Plant your feet. Move with intent.",
    emoji: "🌿",
  },
  {
    id: "rival",
    name: "Rival",
    tagline: "Peer energy. Beat yesterday.",
    accent: "#A855F7",
    sampleLine: "Yesterday's you would already be finished.",
    emoji: "🏁",
  },
];

export const toTrainerPersonaId = (value: string | null | undefined): TrainerPersonaId =>
  TRAINER_PERSONA_OPTIONS.find((p) => p.id === value)?.id ?? DEFAULT_TRAINER_PERSONA;

export const getTrainerPersonaOption = (
  value: string | null | undefined,
): TrainerPersonaOption =>
  TRAINER_PERSONA_OPTIONS.find((p) => p.id === value) ?? TRAINER_PERSONA_OPTIONS[0]!;
