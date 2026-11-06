/**
 * AMI-199: one table for every OpenAI call: output-token cap and model per feature.
 * Model = `OPENAI_MODEL_<FEATURE>` env → `OPENAI_MODEL` → gpt-4o-mini (cheapest adequate today).
 * Caps sit ~2x above the largest completion seen in smoke runs so valid JSON is never truncated.
 */
import type { MirraEnv } from "../../env";
import type { AiFeature } from "../ai-quotas";

export type OpenAiCallFeature = Exclude<AiFeature, "voice_tts"> | "exercise_tag";

export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

type CallConfig = { maxOutputTokens: number; modelEnv: keyof MirraEnv };

export const AI_CALL_CONFIG: Record<OpenAiCallFeature, CallConfig> = {
  meal_plan: { maxOutputTokens: 900, modelEnv: "OPENAI_MODEL_MEAL_PLAN" },
  plan_gen: { maxOutputTokens: 3000, modelEnv: "OPENAI_MODEL_PLAN_GEN" },
  revise: { maxOutputTokens: 600, modelEnv: "OPENAI_MODEL_REVISE" },
  coach: { maxOutputTokens: 300, modelEnv: "OPENAI_MODEL_COACH" },
  meal_estimate: { maxOutputTokens: 900, modelEnv: "OPENAI_MODEL_MEAL_ESTIMATE" },
  recipe_gen: { maxOutputTokens: 700, modelEnv: "OPENAI_MODEL_CHEF" },
  chef_chat: { maxOutputTokens: 500, modelEnv: "OPENAI_MODEL_CHEF" },
  exercise_tag: { maxOutputTokens: 3500, modelEnv: "OPENAI_MODEL_EXERCISE_TAG" },
};

export const maxOutputTokensFor = (feature: OpenAiCallFeature): number => AI_CALL_CONFIG[feature].maxOutputTokens;

export const openAiModelFor = (env: MirraEnv, feature: OpenAiCallFeature): string => {
  const own = env[AI_CALL_CONFIG[feature].modelEnv];
  return (typeof own === "string" && own.trim()) || env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
};
