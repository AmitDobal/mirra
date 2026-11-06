import { DEFAULT_MONTHLY_GRANT, TOKENS_PER_CREDIT } from "./ai-credits";

/** Plan-tier AI quotas. Heuristic (zero-cost) calls never count against these. */
export type AiTier = "free" | "pro";

/** Stored in `ai_usage_events.feature` / `ai_usage_daily.feature`. */
export type AiFeature =
  | "revise"
  | "coach"
  | "meal_plan"
  | "meal_estimate"
  | "plan_gen"
  | "voice_tts"
  | "recipe_gen"
  | "chef_chat";

export type TierQuota = {
  /** AMI-199: soft cap tied to credits (grant x TOKENS_PER_CREDIT): free 500k, pro 1M. Past it, adapters fall back to the heuristic. */
  monthlyTokens: number;
  /** Per-feature daily call caps. Features not listed are bounded by monthly tokens only. */
  dailyCalls: Partial<Record<AiFeature, number>>;
};

export const AI_QUOTAS: Record<AiTier, TierQuota> = {
  free: {
    monthlyTokens: DEFAULT_MONTHLY_GRANT.free * TOKENS_PER_CREDIT,
    dailyCalls: { revise: 8, coach: 15, voice_tts: 3, meal_plan: 5 },
  },
  pro: {
    monthlyTokens: DEFAULT_MONTHLY_GRANT.pro * TOKENS_PER_CREDIT,
    dailyCalls: { revise: 40, coach: 60, voice_tts: 15, meal_plan: 20 },
  },
};

/** Voice is billed per character, so only its daily cap applies (no token budget). */
export const TOKEN_METERED = (feature: AiFeature): boolean => feature !== "voice_tts";
