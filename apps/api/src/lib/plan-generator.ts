import { createOpenAiPlanGenerator } from "../adapters/openai-plan-generator";
import { heuristicPlanGenerator } from "../adapters/heuristic-plan-generator";
import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import type { PlanGenerateResult, PlanGenerator } from "../ports/plan-generator";

const withGeneratorTag = (
  base: PlanGenerator,
  tag: "openai" | "heuristic",
): PlanGenerator => ({
  generate: async (input) => {
    const result: PlanGenerateResult = await base.generate(input);
    if (result.summary.generator) return result;
    return { ...result, summary: { ...result.summary, generator: tag } };
  },
});

type FactoryOpts = { db?: AppDB; userId?: string };

/** OpenAI when OPENAI_API_KEY is set; otherwise heuristic. */
export const getPlanGenerator = (
  env: MirraEnv,
  opts?: FactoryOpts,
): PlanGenerator => {
  if (env.OPENAI_API_KEY?.trim()) {
    return createOpenAiPlanGenerator(env, opts);
  }
  return withGeneratorTag(heuristicPlanGenerator, "heuristic");
};
