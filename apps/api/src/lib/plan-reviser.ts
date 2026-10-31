import { heuristicPlanReviser } from "../adapters/heuristic-plan-reviser";
import { createOpenAiPlanReviser } from "../adapters/openai-plan-reviser";
import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import type { PlanReviser } from "../ports/plan-reviser";
import { canSpend } from "../services/ai-budget";
import { resolveAiProvider } from "./ai/resolve-provider";
import { hasAnyIntent } from "./plan-intent";

/** Messages shorter than this are never worth an LLM call. */
export const MIN_LLM_MESSAGE_CHARS = 12;

/**
 * Cheap-first reviser: heuristic rules ALWAYS run first (chip prompts cost $0).
 * The LLM runs only when rules found nothing, the message is long enough, and the
 * user's `revise` budget allows it. Any other case stays on the heuristic result.
 */
const createTieredReviser = (llm: PlanReviser, db?: AppDB): PlanReviser => ({
  propose: async (input) => {
    const rules = await heuristicPlanReviser.propose(input);
    if (hasAnyIntent(rules.intent)) return rules;
    if (input.message.trim().length < MIN_LLM_MESSAGE_CHARS) return rules;
    if (!(await canSpend(db, input.userId, "revise"))) {
      return { ...rules, warnings: [...rules.warnings, "AI chat limit reached; using quick rules"] };
    }
    return llm.propose(input);
  },
});

/** Provider-swappable plan editor. Same `AI_PROVIDER` resolution as plans/coach. */
export const getPlanReviser = (env: MirraEnv, db?: AppDB): PlanReviser => {
  const provider = resolveAiProvider(env);
  switch (provider) {
    case "openai":
      return createTieredReviser(createOpenAiPlanReviser(env, db), db);
    case "anthropic":
    case "workers-ai":
      console.warn(`[ai] ${provider} PlanReviser not implemented; heuristic`);
      return heuristicPlanReviser;
    case "heuristic":
    default:
      return heuristicPlanReviser;
  }
};
