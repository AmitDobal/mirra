import { apiFetch } from "./client";

export type UsageWindow = { readonly used: number; readonly limit: number };

/** Mirrors API `GET /v1/ai/usage`. */
export type AiUsage = {
  readonly tier: "free" | "pro";
  readonly monthTokensUsed: number;
  readonly monthTokensLimit: number;
  readonly features: {
    readonly revise: UsageWindow;
    readonly coach: UsageWindow;
    readonly voice: UsageWindow;
    readonly mealPlan: UsageWindow;
  };
};

export const getAiUsage = () => apiFetch<AiUsage>("/v1/ai/usage");
