import type { CreditsResponse } from "@mirra/contracts";

import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import {
  ABS_MONTHLY_CREDITS,
  CREDIT_COSTS,
  MONTHLY_ACTION_CAPS,
  nextPeriodStart,
  periodOf,
  resolveCreditsMode,
  usdCapMicrosFor,
} from "../lib/ai-credits";
import type { AiFeature } from "../lib/ai-quotas";
import { getEntitlementTier } from "./ai-budget";
import { effectiveCap, ensurePeriod, monthActionCount, monthUsdMicros, remainingOf } from "./credits-ledger";
import { releaseExpired } from "./credits-reservations";

/** Read model for `GET /v1/credits` (also lazily creates this month's grant). */
export const getCredits = async (db: AppDB, env: MirraEnv, userId: string): Promise<CreditsResponse> => {
  const period = periodOf();
  const tier = await getEntitlementTier(db, userId);
  await releaseExpired(db, userId);
  const row = await ensurePeriod(db, env, userId, tier, period);
  const remaining = remainingOf(row, tier);
  const capMicros = usdCapMicrosFor(env, tier);
  const usedMicros = await monthUsdMicros(db, userId, period);

  const actionCaps: CreditsResponse["actionCaps"] = {};
  for (const [feature, limit] of Object.entries(MONTHLY_ACTION_CAPS[tier])) {
    actionCaps[feature] = { used: await monthActionCount(db, userId, period, feature as AiFeature), limit };
  }

  const cap = effectiveCap(row, tier);
  const warnings: CreditsResponse["warnings"] = [];
  if (remaining === 0) warnings.push("out_of_credits");
  else if (cap > 0 && remaining / cap <= 0.2) warnings.push("low_credits");
  if (capMicros > 0 && usedMicros / capMicros >= 0.8) warnings.push("spend_cap_near");

  return {
    tier,
    mode: resolveCreditsMode(env),
    period,
    granted: row.granted,
    bonus: row.bonus,
    spent: row.spent,
    reserved: row.reserved,
    remaining,
    absoluteCap: ABS_MONTHLY_CREDITS[tier],
    resetsAt: nextPeriodStart(period).toISOString(),
    costs: { ...CREDIT_COSTS },
    usd: { usedMicros, capMicros },
    actionCaps,
    warnings,
    referralTopUpEnabled: env.REFERRAL_TOPUP_ENABLED === "true",
  };
};
