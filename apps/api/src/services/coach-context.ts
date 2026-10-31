import type { CoachAccountability } from "../ports/coach-advisor";
import type { PersonalDayContext } from "./personal-context";
import { tenureLine } from "./user-tenure";

const tenureOf = (p: PersonalDayContext): string | null =>
  tenureLine({ joinedAt: p.joinedAt, tenureDays: p.tenureDays });

const NOTE_MAX = 200;

/** Structured pack handed to the coach advisor (adapter-agnostic). */
export const toCoachAccountability = (p: PersonalDayContext): CoachAccountability => ({
  scenario: p.scenario,
  secondary: p.secondaryScenarios,
  facts: p.facts,
  historySummary: p.historySummary,
  tenureLine: tenureOf(p),
});

/**
 * Compact `k: v` lines for the LLM (no meal names, no plan text). Example:
 *   scenario: OVER_KCAL (also: UNDER_PROTEIN)
 *   fuel: Fuel 2500/2000 kcal (OVER by 500) · Protein 90/150g (60g short) · Pending: Push · Check-in open
 *   delta: kcal +500, protein -60g
 *   history: Joined 2026-10-31 (0d) | 1d: avg 2310 kcal vs 2000 (+16%) ...
 */
export const buildCoachContext = (
  p: PersonalDayContext,
  extra: { note?: string; context?: string },
): string => {
  const also = p.secondaryScenarios.length ? ` (also: ${p.secondaryScenarios.join(", ")})` : "";
  return [
    `scenario: ${p.scenario}${also}`,
    `today: ${p.briefing}`,
    `delta: kcal ${p.fuel.kcalDelta > 0 ? "+" : ""}${p.fuel.kcalDelta}, protein ${p.fuel.proteinGDelta > 0 ? "+" : ""}${p.fuel.proteinGDelta}g`,
    `history: ${[tenureOf(p), p.historySummary].filter(Boolean).join(" | ")}`,
    extra.note ? `note: ${extra.note.slice(0, NOTE_MAX)}` : null,
    extra.context ? `context: ${extra.context.slice(0, NOTE_MAX)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
};
