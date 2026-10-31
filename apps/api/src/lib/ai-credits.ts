import type { MirraEnv } from "../env";
import type { AiFeature, AiTier } from "./ai-quotas";

/** `off` = no ledger, `shadow` = ledger written but never blocks, `enforce` = hard caps + 402/429. */
export type AiCreditsMode = "off" | "shadow" | "enforce";

export const DEFAULT_CREDITS_MODE: AiCreditsMode = "shadow";

export const resolveCreditsMode = (env: Pick<MirraEnv, "AI_CREDITS_MODE">): AiCreditsMode => {
  const raw = env.AI_CREDITS_MODE?.trim().toLowerCase();
  if (raw === "off" || raw === "shadow" || raw === "enforce") return raw;
  return DEFAULT_CREDITS_MODE;
};

/** Credits per paid (non-heuristic) AI action. Heuristic calls never reserve. */
export const CREDIT_COSTS: Record<AiFeature, number> = {
  revise: 1,
  coach: 1,
  meal_estimate: 1,
  meal_plan: 3,
  plan_gen: 5,
  recipe_gen: 2,
  chef_chat: 1,
  voice_tts: 1,
};

/** Default monthly grant per tier. RevenueCat `pro` entitlement maps to the `pro` row. */
export const DEFAULT_MONTHLY_GRANT: Record<AiTier, number> = { free: 40, pro: 400 };

/** Absolute monthly ceiling (grant + bonus can never be spent past this). */
export const ABS_MONTHLY_CREDITS: Record<AiTier, number> = { free: 60, pro: 600 };

/** Referral bonus per month, all tiers. */
export const BONUS_CAP_PER_MONTH = 20;
export const REFERRAL_AWARD_CREDITS = 10;

/** Monthly provider-cost ceiling in USD micros (1_000_000 = $1). */
export const DEFAULT_USD_CAP_MICROS: Record<AiTier, number> = {
  free: 500_000,
  pro: 6_000_000,
};

/** Hard monthly per-feature action caps (expensive generations only). Absent = credits only. */
export const MONTHLY_ACTION_CAPS: Record<AiTier, Partial<Record<AiFeature, number>>> = {
  free: { meal_plan: 2, plan_gen: 2 },
  pro: { meal_plan: 20, plan_gen: 12 },
};

/** Reservation hold; open rows past this are released lazily on next read/reserve. */
export const RESERVATION_TTL_MS = 120_000;

const intOr = (raw: string | undefined, fallback: number): number => {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export const monthlyGrantFor = (env: MirraEnv, tier: AiTier): number =>
  tier === "pro"
    ? intOr(env.AI_CREDITS_PRO_GRANT, DEFAULT_MONTHLY_GRANT.pro)
    : intOr(env.AI_CREDITS_FREE_GRANT, DEFAULT_MONTHLY_GRANT.free);

export const usdCapMicrosFor = (env: MirraEnv, tier: AiTier): number =>
  tier === "pro"
    ? intOr(env.AI_USD_CAP_PRO_MICROS, DEFAULT_USD_CAP_MICROS.pro)
    : intOr(env.AI_USD_CAP_FREE_MICROS, DEFAULT_USD_CAP_MICROS.free);

/** `YYYY-MM` in UTC. */
export const periodOf = (d: Date = new Date()): string => d.toISOString().slice(0, 7);

/** First instant of the next UTC month (when credits reset). */
export const nextPeriodStart = (period: string): Date => {
  const [y, m] = period.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1));
};

export const periodStartDay = (period: string): string => `${period}-01`;
