import { createOpenAiCoachAdvisor } from "../adapters/openai-coach-advisor";
import { heuristicCoachAdvisor } from "../adapters/heuristic-coach-advisor";
import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import type { CoachAdvisor } from "../ports/coach-advisor";

/** OpenAI when key present; else heuristic. */
export const getCoachAdvisor = (env: MirraEnv, db?: AppDB): CoachAdvisor => {
  if (env.OPENAI_API_KEY?.trim()) return createOpenAiCoachAdvisor(env, db);
  return heuristicCoachAdvisor;
};

export const hasOpenAi = (env: MirraEnv): boolean =>
  Boolean(env.OPENAI_API_KEY?.trim());
