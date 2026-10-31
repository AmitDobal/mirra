/** Coach AI — short advise + optional rebuild vectors. */

export type CoachAdviseInput = {
  userId: string;
  readiness?: number;
  status: string;
  note?: string;
  vectorId?: string;
  context?: string;
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
  /** Which advisor produced this (credits gate settles only paid results). */
  source?: "openai" | "heuristic";
};

export type CoachAdvisor = {
  advise: (input: CoachAdviseInput) => Promise<CoachAdviseResult>;
};
