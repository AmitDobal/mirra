import { MirraApiError, apiFetch } from "./client";

/** Mirrors contracts `CreditsResponse` (user-facing meter + warnings). */
export type CreditsSnapshot = {
  readonly tier: "free" | "pro";
  readonly mode: "off" | "shadow" | "enforce";
  readonly period: string;
  readonly granted: number;
  readonly bonus: number;
  readonly spent: number;
  readonly reserved: number;
  readonly remaining: number;
  readonly absoluteCap: number;
  readonly resetsAt: string;
  readonly costs: Readonly<Record<string, number>>;
  readonly warnings: readonly ("low_credits" | "out_of_credits" | "spend_cap_near")[];
  readonly referralTopUpEnabled: boolean;
};

/** GET /v1/credits — monthly AI credit balance (works in shadow + enforce). */
export const getCredits = () => apiFetch<CreditsSnapshot>("/v1/credits");

/** Total pool for the meter (grant + bonus, capped by absolute when useful). */
export const creditsPool = (c: CreditsSnapshot): number => {
  const pool = c.granted + c.bonus;
  if (pool > 0) return pool;
  return Math.max(c.absoluteCap, c.spent + c.remaining);
};

/** 402 out of credits (or explicit exhausted code). */
export const isOutOfCredits = (err: unknown): boolean => {
  if (!(err instanceof MirraApiError)) return false;
  if (err.status === 402) return true;
  return err.code === "ai_credits_exhausted";
};
