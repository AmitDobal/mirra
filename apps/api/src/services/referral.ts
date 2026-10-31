import type { ReferralInfo, ReferralRedeemResponse } from "@mirra/contracts";
import { and, count, eq } from "drizzle-orm";

import type { AppDB } from "../db";
import { profiles, referralCodes, referralRedemptions } from "../db/schema";
import type { MirraEnv } from "../env";
import { BONUS_CAP_PER_MONTH, REFERRAL_AWARD_CREDITS, periodOf } from "../lib/ai-credits";
import { ApiError, conflict, notFound, validationError } from "../lib/errors";
import { newId } from "../lib/id";
import { getEntitlementTier } from "./ai-budget";
import { applyCredit, ensurePeriod } from "./credits-ledger";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const makeCode = (): string => {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
};

const topUpEnabled = (env: MirraEnv): boolean => env.REFERRAL_TOPUP_ENABLED === "true";

/** Lazily create the caller's code. Retries on the (very rare) unique collision. */
const getOrCreateCode = async (db: AppDB, userId: string): Promise<string> => {
  const [existing] = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);
  if (existing) return existing.code;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    await db.insert(referralCodes).values({ userId, code }).onConflictDoNothing();
    const [row] = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);
    if (row?.code === code) return code;
    if (row) return row.code;
  }
  throw new ApiError("internal", "Could not create referral code", 500);
};

export const getReferralInfo = async (
  db: AppDB,
  env: MirraEnv,
  userId: string,
): Promise<ReferralInfo> => {
  const code = await getOrCreateCode(db, userId);
  const tier = await getEntitlementTier(db, userId);
  const period = await ensurePeriod(db, env, userId, tier);
  const [redeemed] = await db
    .select({ n: count() })
    .from(referralRedemptions)
    .where(and(eq(referralRedemptions.referrerUserId, userId), eq(referralRedemptions.status, "awarded")));
  return {
    code,
    shareUrl: `mirra://invite?code=${code}`,
    redeemedCount: redeemed?.n ?? 0,
    bonusThisMonth: period.bonus,
    bonusCap: BONUS_CAP_PER_MONTH,
    topUpEnabled: topUpEnabled(env),
  };
};

/**
 * STUB. Records a pending redemption (self + repeat blocked). Credits are awarded only when
 * `REFERRAL_TOPUP_ENABLED=true` and the referee finished onboarding; otherwise stays `pending`.
 */
export const redeemReferral = async (
  db: AppDB,
  env: MirraEnv,
  refereeId: string,
  rawCode: string,
): Promise<ReferralRedeemResponse> => {
  const code = rawCode.trim().toUpperCase();
  const [owner] = await db.select().from(referralCodes).where(eq(referralCodes.code, code)).limit(1);
  if (!owner) throw notFound("Referral code not found");
  if (owner.userId === refereeId) throw validationError("You can't use your own referral code");

  const redemptionId = newId();
  const inserted = await db
    .insert(referralRedemptions)
    .values({ id: redemptionId, referrerUserId: owner.userId, refereeUserId: refereeId, status: "pending" })
    .onConflictDoNothing()
    .returning({ id: referralRedemptions.id });
  if (inserted.length === 0) throw conflict("A referral code was already redeemed on this account");

  if (!topUpEnabled(env)) return { status: "pending", creditsAwarded: 0 };

  const [profile] = await db
    .select({ done: profiles.onboardingCompletedAt })
    .from(profiles)
    .where(eq(profiles.userId, refereeId))
    .limit(1);
  if (!profile?.done) return { status: "pending", creditsAwarded: 0 };

  return awardReferrer(db, env, owner.userId, redemptionId);
};

const awardReferrer = async (
  db: AppDB,
  env: MirraEnv,
  referrerId: string,
  redemptionId: string,
): Promise<ReferralRedeemResponse> => {
  const tier = await getEntitlementTier(db, referrerId);
  const period = await ensurePeriod(db, env, referrerId, tier);
  const amount = Math.min(REFERRAL_AWARD_CREDITS, BONUS_CAP_PER_MONTH - period.bonus);
  if (amount <= 0) return { status: "pending", creditsAwarded: 0 };
  const applied = await applyCredit(db, {
    userId: referrerId,
    period: periodOf(),
    amount,
    bucket: "bonus",
    kind: "referral",
    idempotencyKey: `referral:${redemptionId}`,
    refId: redemptionId,
  });
  if (!applied) return { status: "awarded", creditsAwarded: 0 };
  await db
    .update(referralRedemptions)
    .set({ status: "awarded", creditsAwarded: amount })
    .where(eq(referralRedemptions.id, redemptionId));
  return { status: "awarded", creditsAwarded: amount };
};
