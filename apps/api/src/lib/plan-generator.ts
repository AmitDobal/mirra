import { createOpenAiPlanGenerator } from "../adapters/openai-plan-generator";
import { heuristicPlanGenerator } from "../adapters/heuristic-plan-generator";
import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import type { PlanGenerateResult, PlanGenerator } from "../ports/plan-generator";
import { resolveAiProvider, type AiProviderId } from "./ai/resolve-provider";

const withGeneratorTag = (
  base: PlanGenerator,
  tag: AiProviderId,
): PlanGenerator => ({
  generate: async (input) => {
    const result: PlanGenerateResult = await base.generate(input);
    if (result.summary.generator) return result;
    return {
      ...result,
      summary: {
        ...result.summary,
        generator: tag === "openai" ? "openai" : "heuristic",
      },
    };
  },
});

type FactoryOpts = { db?: AppDB; userId?: string };

/**
 * Provider-swappable plan AI. Add Anthropic / Workers AI adapters here —
 * routes keep calling `getPlanGenerator` only.
 */
export const getPlanGenerator = (
  env: MirraEnv,
  opts?: FactoryOpts,
): PlanGenerator => {
  const provider = resolveAiProvider(env);
  switch (provider) {
    case "openai":
      return createOpenAiPlanGenerator(env, opts);
    case "anthropic":
      // Reserved: createAnthropicPlanGenerator(env, opts)
      console.warn("[ai] anthropic PlanGenerator not implemented; heuristic");
      return withGeneratorTag(heuristicPlanGenerator, "heuristic");
    case "workers-ai":
      console.warn("[ai] workers-ai PlanGenerator not implemented; heuristic");
      return withGeneratorTag(heuristicPlanGenerator, "heuristic");
    case "heuristic":
    default:
      return withGeneratorTag(heuristicPlanGenerator, "heuristic");
  }
};
