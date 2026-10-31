import { toTrainerPersonaId, type TrainerPersona } from "@mirra/contracts";
import { eq } from "drizzle-orm";

import type { AppDB } from "../db";
import { preferences } from "../db/schema";

/** Persona from the user's preferences row; `drill` when unset or no row yet. */
export const loadTrainerPersona = async (db: AppDB, userId: string): Promise<TrainerPersona> => {
  const [row] = await db
    .select({ trainerPersona: preferences.trainerPersona })
    .from(preferences)
    .where(eq(preferences.userId, userId))
    .limit(1);
  return toTrainerPersonaId(row?.trainerPersona);
};

/** Short opener per persona for deterministic (non-LLM) copy. */
const OPENERS: Record<TrainerPersona, string> = {
  drill: "Listen up, recruit.",
  honey: "Hey you, I am proud you showed up.",
  wit: "Oh, we are doing this now? Great.",
  spark: "Plot twist time!",
  zen: "Breathe. One thing at a time.",
  rival: "Scoreboard check.",
};

/** Short closer per persona (heuristic coach only). */
const CLOSERS: Record<TrainerPersona, string> = {
  drill: "Move it.",
  honey: "You have got this.",
  wit: "Try not to faint from effort.",
  spark: "Go be a legend.",
  zen: "Small step, then done.",
  rival: "Beat yesterday.",
};

/** Wrap a base message with the persona's opener and closer. */
export const styleHeuristicCopy = (persona: TrainerPersona, message: string): string =>
  `${OPENERS[persona]} ${message} ${CLOSERS[persona]}`.replace(/\s+/g, " ").trim();

/** Voice cue greeting per persona (replaces plain "Morning/Afternoon/Evening"). */
export const personaGreeting = (persona: TrainerPersona, base: string): string => {
  switch (persona) {
    case "drill":
      return `${base}, recruit`;
    case "honey":
      return `${base}, lovely`;
    case "wit":
      return `${base}, champ`;
    case "spark":
      return `${base}, superstar`;
    case "zen":
      return `${base}, steady`;
    case "rival":
      return `${base}, challenger`;
  }
};
