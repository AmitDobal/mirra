/** Coach AI — short advise + optional rebuild vectors. */

import type { AccountabilityScenario, TrainerPersona } from "@mirra/contracts";

import type { ScenarioFacts } from "../services/accountability-scenarios";

/** Accountability pack: scenario + hard numbers + compact history. */
export type CoachAccountability = {
  scenario: AccountabilityScenario;
  secondary: AccountabilityScenario[];
  facts: ScenarioFacts;
  historySummary: string;
  /** `Joined YYYY-MM-DD (Nd)`; null when unknown. */
  tenureLine?: string | null;
};

export type CoachAdviseInput = {
  userId: string;
  readiness?: number;
  status: string;
  note?: string;
  vectorId?: string;
  context?: string;
  accountability?: CoachAccountability;
  /** Trainer character voice; defaults to drill when absent. */
  persona?: TrainerPersona;
};

export type CoachVector = {
  id: string;
  title: string;
  detail: string;
  recommended: boolean;
};

export type CoachAdviseResult = {
  message: string;
  vectors?: CoachVector[];
  rebuildSuggested: boolean;
  /** Which adapter produced this result. */
  source?: "openai" | "heuristic";
  scenario?: AccountabilityScenario;
};

export type CoachAdvisor = {
  advise: (input: CoachAdviseInput) => Promise<CoachAdviseResult>;
};
