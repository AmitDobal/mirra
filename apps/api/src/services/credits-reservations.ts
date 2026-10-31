import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import {
  ABS_MONTHLY_CREDITS,
  CREDIT_COSTS,
  MONTHLY_ACTION_CAPS,
  RESERVATION_TTL_MS,
  nextPeriodStart,
  periodOf,
  periodStartDay,
  usdCapMicrosFor,
  type AiCreditsMode,
} from "../lib/ai-credits";
import type { AiFeature, AiTier } from "../lib/ai-quotas";
import { ApiError } from "../lib/errors";
import { newId } from "../lib/id";
import {
  ensurePeriod,
  monthActionCount,
  monthUsdMicros,
  raw,
  readPeriod,
  remainingOf,
} from "./credits-ledger";

export type Reservation = { id: string; credits: number; period: string; userId: string };

/** Why a reserve was refused (enforce) or would have been (shadow log). */
const explainDenial = async (
  db: AppDB,
  env: MirraEnv,
  input: { userId: string; feature: AiFeature; tier: AiTier; period: string; cost: number },
): Promise<ApiError | null> => {
  const { userId, feature, tier, period, cost } = input;
  const row = (await readPeriod(db, userId, period)) ?? { granted: 0, bonus: 0, spent: 0, reserved: 0 };
  const resetsAt = nextPeriodStart(period).toISOString();
  const remaining = remainingOf(row, tier);
  if (remaining < cost) {
    return new ApiError("ai_credits_exhausted", "You're out of AI credits for this month", 402, {
      remaining,
      cost,
      resetsAt,
      heuristicAvailable: true,
    });
  }
  const usd = await monthUsdMicros(db, userId, period);
  if (usd >= usdCapMicrosFor(env, tier)) {
    return new ApiError("ai_spend_cap", "Monthly AI limit reached", 429, { resetsAt, heuristicAvailable: true });
  }
  const actionCap = MONTHLY_ACTION_CAPS[tier][feature];
  if (actionCap !== undefined && (await monthActionCount(db, userId, period, feature)) >= actionCap) {
    return new ApiError("ai_action_cap", `Monthly ${feature} limit reached`, 429, {
      feature,
      limit: actionCap,
      resetsAt,
      heuristicAvailable: true,
    });
  }
  return null;
};

/**
 * Hold `CREDIT_COSTS[feature]` credits. `enforce` throws 402/429 when a guard fails;
 * `shadow` records the same rows without any guard (balance may go negative) and logs
 * what enforce would have done.
 */
export const reserveCredits = async (
  db: AppDB,
  env: MirraEnv,
  input: { userId: string; feature: AiFeature; tier: AiTier; mode: Exclude<AiCreditsMode, "off"> },
): Promise<Reservation> => {
  const { userId, feature, tier, mode } = input;
  const period = periodOf();
  const cost = CREDIT_COSTS[feature];
  await ensurePeriod(db, env, userId, tier, period);
  await releaseExpired(db, userId);

  const id = newId();
  const now = Date.now();
  const enforce = mode === "enforce";
  const actionCap = MONTHLY_ACTION_CAPS[tier][feature] ?? 1_000_000_000;
  const d1 = raw(db);

  const guard = enforce
    ? `AND MIN(p.granted + p.bonus, ?9) - p.spent - p.reserved >= ?5
       AND (SELECT COALESCE(SUM(estimated_micros), 0) FROM ai_usage_daily WHERE user_id = ?2 AND day >= ?10) < ?11
       AND (SELECT COUNT(*) FROM ai_credit_reservations
            WHERE user_id = ?2 AND period = ?3 AND feature = ?4 AND status IN ('open','settled')) < ?12`
    : "";
  const binds: (string | number)[] = [id, userId, period, feature, cost, mode, now, now + RESERVATION_TTL_MS];
  if (enforce) {
    binds.push(ABS_MONTHLY_CREDITS[tier], periodStartDay(period), usdCapMicrosFor(env, tier), actionCap);
  } else {
    const wouldBlock = await explainDenial(db, env, { userId, feature, tier, period, cost });
    if (wouldBlock) console.warn("[ai-credits] shadow: enforce would block", feature, wouldBlock.code);
  }

  const [ins] = await d1.batch([
    d1
      .prepare(
        `INSERT INTO ai_credit_reservations
           (id, user_id, period, feature, credits_reserved, status, mode, created_at, expires_at)
         SELECT ?1, ?2, ?3, ?4, ?5, 'open', ?6, ?7, ?8
         WHERE EXISTS (SELECT 1 FROM ai_credit_periods p WHERE p.user_id = ?2 AND p.period = ?3 ${guard})`,
      )
      .bind(...binds),
    d1
      .prepare(
        `UPDATE ai_credit_periods SET reserved = reserved + ?1, updated_at = ?2
         WHERE user_id = ?3 AND period = ?4 AND EXISTS (SELECT 1 FROM ai_credit_reservations WHERE id = ?5)`,
      )
      .bind(cost, now, userId, period, id),
    d1
      .prepare(
        `INSERT INTO ai_credit_ledger
           (id, user_id, period, delta, kind, feature, reservation_id, idempotency_key, created_at)
         SELECT ?1, ?2, ?3, -?4, 'reserve', ?5, ?6, ?7, ?8
         WHERE EXISTS (SELECT 1 FROM ai_credit_reservations WHERE id = ?6)`,
      )
      .bind(newId(), userId, period, cost, feature, id, `reserve:${id}`, now),
  ]);

  if ((ins?.meta.changes ?? 0) === 1) {
    return { id, credits: cost, period, userId };
  }
  const denial = await explainDenial(db, env, { userId, feature, tier, period, cost });
  throw denial ?? new ApiError("ai_credits_exhausted", "AI credits unavailable", 402);
};

/** Convert an open hold into spend (fixed price). No-op if already settled/released. */
export const settleReservation = async (db: AppDB, reservationId: string): Promise<void> => {
  const r = await loadOpen(db, reservationId);
  if (!r) return;
  const d1 = raw(db);
  const now = Date.now();
  const open = "EXISTS (SELECT 1 FROM ai_credit_reservations WHERE id = ?1 AND status = 'open')";
  await d1.batch([
    d1
      .prepare(
        `UPDATE ai_credit_periods SET
           spent = spent + (SELECT credits_reserved FROM ai_credit_reservations WHERE id = ?1),
           reserved = reserved - (SELECT credits_reserved FROM ai_credit_reservations WHERE id = ?1),
           updated_at = ?2
         WHERE user_id = ?3 AND period = ?4 AND ${open}`,
      )
      .bind(reservationId, now, r.userId, r.period),
    d1
      .prepare(
        `INSERT OR IGNORE INTO ai_credit_ledger
           (id, user_id, period, delta, kind, feature, reservation_id, idempotency_key, created_at)
         SELECT ?2, ?3, ?4, 0, 'settle', ?5, ?1, ?6, ?7 WHERE ${open}`,
      )
      .bind(reservationId, newId(), r.userId, r.period, r.feature, `settle:${reservationId}`, now),
    d1
      .prepare(
        `UPDATE ai_credit_reservations
         SET status = 'settled', credits_settled = credits_reserved, settled_at = ?2
         WHERE id = ?1 AND status = 'open'`,
      )
      .bind(reservationId, now),
  ]);
};

/** Give a hold back (provider error, heuristic result, or expiry). No-op if not open. */
export const releaseReservation = async (
  db: AppDB,
  reservationId: string,
  status: "released" | "expired" = "released",
): Promise<void> => {
  const r = await loadOpen(db, reservationId);
  if (!r) return;
  const d1 = raw(db);
  const now = Date.now();
  const open = "EXISTS (SELECT 1 FROM ai_credit_reservations WHERE id = ?1 AND status = 'open')";
  await d1.batch([
    d1
      .prepare(
        `UPDATE ai_credit_periods SET
           reserved = reserved - (SELECT credits_reserved FROM ai_credit_reservations WHERE id = ?1),
           updated_at = ?2
         WHERE user_id = ?3 AND period = ?4 AND ${open}`,
      )
      .bind(reservationId, now, r.userId, r.period),
    d1
      .prepare(
        `INSERT OR IGNORE INTO ai_credit_ledger
           (id, user_id, period, delta, kind, feature, reservation_id, idempotency_key, created_at)
         SELECT ?2, ?3, ?4, credits_reserved, 'release', ?5, ?1, ?6, ?7
         FROM ai_credit_reservations WHERE id = ?1 AND status = 'open'`,
      )
      .bind(reservationId, newId(), r.userId, r.period, r.feature, `release:${reservationId}`, now),
    d1
      .prepare(
        `UPDATE ai_credit_reservations SET status = ?2, settled_at = ?3
         WHERE id = ?1 AND status = 'open'`,
      )
      .bind(reservationId, status, now),
  ]);
};

const loadOpen = async (
  db: AppDB,
  id: string,
): Promise<{ userId: string; period: string; feature: string } | null> => {
  const r = await raw(db)
    .prepare("SELECT user_id, period, feature FROM ai_credit_reservations WHERE id = ?1 AND status = 'open'")
    .bind(id)
    .first<{ user_id: string; period: string; feature: string }>();
  return r ? { userId: r.user_id, period: r.period, feature: r.feature } : null;
};

/** Lazy sweep instead of a cron: release this user's holds that outlived their TTL. */
export const releaseExpired = async (db: AppDB, userId: string): Promise<void> => {
  const { results } = await raw(db)
    .prepare("SELECT id FROM ai_credit_reservations WHERE user_id = ?1 AND status = 'open' AND expires_at < ?2")
    .bind(userId, Date.now())
    .all<{ id: string }>();
  for (const { id } of results) await releaseReservation(db, id, "expired");
};
