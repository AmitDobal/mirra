import { createOpenAiCoachAdvisor } from "../adapters/openai-coach-advisor";
import { heuristicCoachAdvisor } from "../adapters/heuristic-coach-advisor";
import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import type { CoachAdvisor } from "../ports/coach-advisor";
import { resolveAiProvider } from "./ai/resolve-provider";

/**
 * Provider-swappable co-coach. Same `AI_PROVIDER` resolution as plans.
 * Routes/UI must not import OpenAI adapters directly.
 */
export const getCoachAdvisor = (env: MirraEnv, db?: AppDB): CoachAdvisor => {
  const provider = resolveAiProvider(env);
  switch (provider) {
    case "openai":
      return createOpenAiCoachAdvisor(env, db);
    case "anthropic":
      console.warn("[ai] anthropic CoachAdvisor not implemented; heuristic");
      return heuristicCoachAdvisor;
    case "workers-ai":
      console.warn("[ai] workers-ai CoachAdvisor not implemented; heuristic");
      return heuristicCoachAdvisor;
    case "heuristic":
    default:
      return heuristicCoachAdvisor;
  }
};

export const hasOpenAi = (env: MirraEnv): boolean =>
  Boolean(env.OPENAI_API_KEY?.trim());
