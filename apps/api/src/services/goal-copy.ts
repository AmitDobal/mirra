/**
 * Goal copy for AI ports (AMI-181, arch §6): the weight-free chef line, heuristic templates
 * that follow `GOAL_PROMPT_RULES`, and the banned-word guard every AI reply passes through.
 * Pure: no D1, no clock.
 */
import { findBannedGoalWords, GOAL_PROMPT_RULES, type GoalContext } from "@mirra/contracts";

import { monthDay } from "../lib/goal";
import { findShameHits } from "./tone-guard";

const GOAL_WORDS: Record<GoalContext["goalType"], string> = {
  fat_loss: "fat loss",
  muscle_gain: "muscle gain",
  recomp: "recomp",
  strength: "strength",
  general_fitness: "consistency",
};
const STATUS_WORDS: Record<GoalContext["status"], string> = {
  on_track: "on track",
  ahead: "ahead",
  behind: "behind",
  calibrating: "calibrating",
  no_target: "no target",
};

/** "Goal fat loss · on track · around Feb 18". No kg, lb or trend (chef never talks weight). */
export const weightFreeGoalLine = (g: GoalContext): string => {
  const parts = [`Goal ${GOAL_WORDS[g.goalType]}`, STATUS_WORDS[g.status]];
  if (g.etaExpected) parts.push(`around ${monthDay(g.etaExpected)}`);
  return parts.join(" · ");
};

/** Meal planner goal data (line + status only; budgets stay server numbers). */
export const goalPromptOf = (g: GoalContext | null): { line: string; status: string } | null =>
  g ? { line: g.line, status: g.status } : null;

/** System-prompt tail for any adapter that receives a goal (rules + one feature line). */
export const goalRulesBlock = (featureRule: string): string => `${GOAL_PROMPT_RULES}\n${featureRule}`;

const ratioOf = (r: string): number | null => {
  const [a, b] = r.split("/").map(Number);
  return a !== undefined && b ? a / b : null;
};

/** One concrete next step for a `behind` user: the weakest lever, never a guilt line. */
const behindAction = (g: GoalContext): string => {
  const sessions = ratioOf(g.adherence28d.sessions);
  const checkIns = ratioOf(g.adherence28d.checkIns);
  if (sessions !== null && sessions < 0.75) return "One step for today: get your next planned session in.";
  if (checkIns !== null && checkIns < 0.75) return "One step for today: log a morning weigh-in.";
  return "One step for today: log your meals against today's target.";
};

/**
 * Heuristic coach sentence for the goal (rules 2–5). Null when there is nothing honest to say
 * (no goal, no target). Mentions the ETA at most once.
 */
export const heuristicGoalNote = (g: GoalContext | null | undefined): string | null => {
  if (!g) return null;
  switch (g.status) {
    case "calibrating":
      return "The estimate firms up after two weeks of weigh-ins.";
    case "behind":
      return behindAction(g);
    case "ahead":
      return "Your consistency is paying off. Keep the same steady pace.";
    case "on_track":
      return g.etaExpected
        ? `On track for around ${monthDay(g.etaExpected)} if you keep this up.`
        : "On track. Keep this up.";
    case "no_target":
      return null;
  }
};

/**
 * Banned goal words + rule 3 shame hits (name-calling, excuse talk, body shaming, guilt;
 * AMI-184 `tone-guard.ts`) found in `text`.
 */
export const goalCopyHits = (text: string): string[] => [...findBannedGoalWords(text), ...findShameHits(text)];

/** Whole-reply guard: any banned goal word → logged, and the safe fallback replaces the text. */
export const guardGoalCopy = (text: string, fallback: string, where: string): string => {
  const hits = goalCopyHits(text);
  if (hits.length === 0) return text;
  console.warn(`[goal-copy] ${where}: banned goal words (${hits.join(", ")}); safe copy used`);
  return fallback;
};

/** "Feb 18", "February 18th", "Sept. 3" (capitalised: "you may 2x" is not a date) or ISO. */
const MONTH_DAY =
  /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b|\b(\d{4}-\d{2}-\d{2})\b/g;
const cap = (m: string) => m.slice(0, 3);

/**
 * Rule 1–2 check: every date in `text` comes from the goal (ETA or next milestone), at most
 * `max` of them. Dates are compared as "Feb 18".
 */
export const goalDatesOk = (text: string, g: GoalContext, max = 1): boolean => {
  const allowed = new Set([g.etaExpected, g.nextMilestone?.date].filter((d): d is string => !!d).flatMap((d) => [d, monthDay(d)]));
  const found = [...text.matchAll(MONTH_DAY)].map((m) => m[3] ?? `${cap(m[1]!)} ${Number(m[2])}`);
  return found.length <= max && found.every((d) => allowed.has(d));
};

/**
 * Sentence guard for long replies (chef): drops only the sentences with a banned word so a
 * recipe answer survives. Everything dropped → fallback.
 */
export const scrubGoalCopy = (text: string, fallback: string, where: string): string => {
  if (findBannedGoalWords(text).length === 0) return text;
  const kept = (text.match(/[^.!?]+[.!?]*/g) ?? []).filter((s) => findBannedGoalWords(s).length === 0);
  const out = kept.join("").trim();
  console.warn(`[goal-copy] ${where}: dropped ${out ? "sentences" : "reply"} with banned goal words`);
  return out || fallback;
};
