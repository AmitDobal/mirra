import { and, eq, gte, sql } from "drizzle-orm";

import type { AppDB } from "../db";
import { aiUsageDaily, aiUsageEvents, entitlements } from "../db/schema";
import { AI_QUOTAS, TOKEN_METERED, type AiFeature, type AiTier } from "../lib/ai-quotas";
import { todayUtc } from "../lib/dates";
import { ApiError } from "../lib/errors";
import { newId } from "../lib/id";

export type UsageWindow = { used: number; limit: number };

export type UsageSummary = {
  tier: AiTier;
  monthTokensUsed: number;
  monthTokensLimit: number;
  features: {
    revise: UsageWindow;
    coach: UsageWindow;
    voice: UsageWindow;
    mealPlan: UsageWindow;
  };
};

const PRO_STATUSES = new Set(["active", "trial", "grace"]);

/** `pro` when RevenueCat-synced entitlement is live; otherwise `free`. */
export const getEntitlementTier = async (db: AppDB, userId: string): Promise<AiTier> => {
  const [ent] = await db
    .select({ status: entitlements.status, expiresAt: entitlements.expiresAt })
    .from(entitlements)
    .where(eq(entitlements.userId, userId))
    .limit(1);
  if (!ent || !PRO_STATUSES.has(ent.status)) return "free";
  if (ent.expiresAt && ent.expiresAt.getTime() < Date.now()) return "free";
  return "pro";
};

const monthStartDay = (day: string): string => `${day.slice(0, 7)}-01`;

const loadMonthTokens = async (db: AppDB, userId: string, day: string): Promise<number> => {
  const [row] = await db
    .select({ n: sql<number>`coalesce(sum(${aiUsageDaily.totalTokens}), 0)` })
    .from(aiUsageDaily)
    .where(and(eq(aiUsageDaily.userId, userId), gte(aiUsageDaily.day, monthStartDay(day))));
  return Number(row?.n ?? 0);
};

const loadDailyCalls = async (
  db: AppDB,
  userId: string,
  day: string,
): Promise<Map<string, number>> => {
  const rows = await db
    .select({ feature: aiUsageDaily.feature, calls: aiUsageDaily.calls })
    .from(aiUsageDaily)
    .where(and(eq(aiUsageDaily.userId, userId), eq(aiUsageDaily.day, day)));
  return new Map(rows.map((r) => [r.feature, r.calls]));
};

export const getUsageSummary = async (db: AppDB, userId: string): Promise<UsageSummary> => {
  const day = todayUtc();
  const tier = await getEntitlementTier(db, userId);
  const quota = AI_QUOTAS[tier];
  const [monthTokensUsed, calls] = await Promise.all([
    loadMonthTokens(db, userId, day),
    loadDailyCalls(db, userId, day),
  ]);
  const win = (f: AiFeature): UsageWindow => ({
    used: calls.get(f) ?? 0,
    limit: quota.dailyCalls[f] ?? 0,
  });
  return {
    tier,
    monthTokensUsed,
    monthTokensLimit: quota.monthlyTokens,
    features: {
      revise: win("revise"),
      coach: win("coach"),
      voice: win("voice_tts"),
      mealPlan: win("meal_plan"),
    },
  };
};

/** Throws 429 when the daily call cap or the monthly token budget is spent. */
export const assertCanSpend = async (
  db: AppDB,
  userId: string,
  feature: AiFeature,
): Promise<UsageSummary> => {
  const summary = await getUsageSummary(db, userId);
  const cap = AI_QUOTAS[summary.tier].dailyCalls[feature];
  const used = dailyUsed(summary, feature);
  if (cap !== undefined && used >= cap) {
    throw new ApiError("rate_limited", `Daily ${feature} AI limit reached`, 429);
  }
  if (TOKEN_METERED(feature) && summary.monthTokensUsed >= summary.monthTokensLimit) {
    throw new ApiError("rate_limited", "Monthly AI budget reached", 429);
  }
  return summary;
};

const dailyUsed = (s: UsageSummary, feature: AiFeature): number => {
  switch (feature) {
    case "revise":
      return s.features.revise.used;
    case "coach":
      return s.features.coach.used;
    case "voice_tts":
      return s.features.voice.used;
    case "meal_plan":
      return s.features.mealPlan.used;
    default:
      return 0;
  }
};

/** Non-throwing gate for adapters: false → fall back to the free heuristic path. */
export const canSpend = async (
  db: AppDB | undefined,
  userId: string | undefined,
  feature: AiFeature,
): Promise<boolean> => {
  if (!db || !userId) return true;
  try {
    await assertCanSpend(db, userId, feature);
    return true;
  } catch (err) {
    if (err instanceof ApiError) return false;
    console.warn("[ai-budget] canSpend check failed; allowing", err);
    return true;
  }
};

export type RecordUsageInput = {
  userId: string;
  feature: AiFeature;
  provider: string;
  model?: string | null;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimatedMicros?: number;
  meta?: Record<string, unknown>;
};

/** Append an event and bump the (user, day, feature) rollup. */
export const recordUsage = async (db: AppDB, input: RecordUsageInput): Promise<void> => {
  const tokens = input.totalTokens ?? 0;
  const micros = input.estimatedMicros ?? 0;
  await db.insert(aiUsageEvents).values({
    id: newId(),
    userId: input.userId,
    feature: input.feature,
    provider: input.provider,
    model: input.model ?? null,
    promptTokens: input.promptTokens ?? null,
    completionTokens: input.completionTokens ?? null,
    totalTokens: input.totalTokens ?? null,
    estimatedMicros: micros,
    metaJson: input.meta ? JSON.stringify(input.meta) : null,
    createdAt: new Date(),
  });
  await db
    .insert(aiUsageDaily)
    .values({
      userId: input.userId,
      day: todayUtc(),
      feature: input.feature,
      calls: 1,
      totalTokens: tokens,
      estimatedMicros: micros,
    })
    .onConflictDoUpdate({
      target: [aiUsageDaily.userId, aiUsageDaily.day, aiUsageDaily.feature],
      set: {
        calls: sql`${aiUsageDaily.calls} + 1`,
        totalTokens: sql`${aiUsageDaily.totalTokens} + ${tokens}`,
        estimatedMicros: sql`${aiUsageDaily.estimatedMicros} + ${micros}`,
      },
    });
};
