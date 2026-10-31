import type { TodayActionsResponse, TrainerPersona } from "@mirra/contracts";

import { personaGreeting } from "./trainer-persona";

export const MAX_CUE_CHARS = 180;

const greetingFor = (hour: number): string => {
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
};

/** Make numbers/units sound right when read aloud. */
const speakable = (text: string): string =>
  text.replace(/\bkcal\b/gi, "calories").replace(/…/g, "").replace(/\s+/g, " ").trim();

const clipAtWord = (text: string, max: number): string => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const base = (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:\s]+$/, "");
  return base.endsWith(".") ? base : `${base}.`;
};

/**
 * Short spoken cue built from today's existing actions (no LLM).
 * Persona greeting + vetted next-action reason + the goal title. Max 180 chars.
 */
export const buildVoiceCueText = (
  actions: TodayActionsResponse,
  hourLocal: number,
  persona: TrainerPersona = "drill",
): string => {
  const greeting = personaGreeting(persona, greetingFor(hourLocal));
  const next = actions.next;
  if (!next) return `${greeting}. You're all caught up today. Keep it steady.`;
  const reason = speakable(next.reason).replace(/[.!?]+$/, "");
  const title = speakable(next.title).replace(/[.!?]+$/, "");
  const full = `${greeting}. ${reason}. Next up: ${title}.`;
  return clipAtWord(full.length <= MAX_CUE_CHARS ? full : `${greeting}. ${reason}.`, MAX_CUE_CHARS);
};
