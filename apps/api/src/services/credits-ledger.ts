import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import { ABS_MONTHLY_CREDITS, monthlyGrantFor, periodOf, periodStartDay } from "../lib/ai-credits";
import type { AiFeature, AiTier } from "../lib/ai-quotas";
import { newId } from "../lib/id";

/**
 * Low-level, append-only credit ledger on D1.
 * Every mutation is ONE `D1.batch` (atomic transaction). Spend guards live inside the SQL,
 * so parallel requests cannot overspend: the reservation INSERT only happens when the
 * credit, USD and action-cap conditions hold at write time.
 */

type Bucket = "granted" | "bonus";
type LedgerKind = "monthly_grant" | "referral" | "admin";

/** drizzle-orm/d1 sets `$client` at runtime (typed only on newer versions). Needed for atomic `D1.batch`. */
export const raw = (db: AppDB): D1Database => (db as unknown as { $client: D1Database }).$client;

/** Credit a bucket once per idempotency key (grants, referral awards). Returns true if applied. */
export const applyCredit = async (
  db: AppDB,
  input: {
    userId: string;
    period: string;
    amount: number;
    bucket: Bucket;
    kind: LedgerKind;
    idempotencyKey: string;
    refId?: string;
  },
): Promise<boolean> => {
  if (input.amount <= 0) return false;
  const d1 = raw(db);
  const now = Date.now();
  const [upd] = await d1.batch([
    d1
      .prepare(
        `UPDATE ai_credit_periods SET ${input.bucket} = ${input.bucket} + ?1, updated_at = ?2
         WHERE user_id = ?3 AND period = ?4
           AND NOT EXISTS (SELECT 1 FROM ai_credit_ledger WHERE user_id = ?3 AND idempotency_key = ?5)`,
      )
      .bind(input.amount, now, input.userId, input.period, input.idempotencyKey),
    d1
      .prepare(
        `INSERT OR IGNORE INTO ai_credit_ledger
           (id, user_id, period, delta, kind, ref_id, idempotency_key, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      )
      .bind(newId(), input.userId, input.period, input.amount, input.kind, input.refId ?? null, input.idempotencyKey, now),
  ]);
  return (upd?.meta.changes ?? 0) === 1;
};

export type PeriodRow = {
  granted: number;
  bonus: number;
  spent: number;
  reserved: number;
};

export const readPeriod = async (db: AppDB, userId: string, period: string): Promise<PeriodRow | null> =>
  raw(db)
    .prepare("SELECT granted, bonus, spent, reserved FROM ai_credit_periods WHERE user_id = ?1 AND period = ?2")
    .bind(userId, period)
    .first<PeriodRow>();

/** Lazy monthly grant. Safe to call on every read/spend; tier upgrades top up the difference once. */
export const ensurePeriod = async (
  db: AppDB,
  env: MirraEnv,
  userId: string,
  tier: AiTier,
  period: string = periodOf(),
): Promise<PeriodRow> => {
  await raw(db)
    .prepare("INSERT OR IGNORE INTO ai_credit_periods (user_id, period, updated_at) VALUES (?1, ?2, ?3)")
    .bind(userId, period, Date.now())
    .run();
  let row = (await readPeriod(db, userId, period))!;
  const topUp = monthlyGrantFor(env, tier) - row.granted;
  if (topUp > 0) {
    await applyCredit(db, {
      userId,
      period,
      amount: topUp,
      bucket: "granted",
      kind: "monthly_grant",
      idempotencyKey: `monthly_grant:${period}:${tier}`,
    });
    row = (await readPeriod(db, userId, period))!;
  }
  return row;
};

export const effectiveCap = (row: PeriodRow, tier: AiTier): number =>
  Math.min(row.granted + row.bonus, ABS_MONTHLY_CREDITS[tier]);

export const remainingOf = (row: PeriodRow, tier: AiTier): number =>
  Math.max(0, effectiveCap(row, tier) - row.spent - row.reserved);

export const monthUsdMicros = async (db: AppDB, userId: string, period: string): Promise<number> => {
  const r = await raw(db)
    .prepare(
      "SELECT COALESCE(SUM(estimated_micros), 0) AS n FROM ai_usage_daily WHERE user_id = ?1 AND day >= ?2",
    )
    .bind(userId, periodStartDay(period))
    .first<{ n: number }>();
  return Number(r?.n ?? 0);
};

export const monthActionCount = async (
  db: AppDB,
  userId: string,
  period: string,
  feature: AiFeature,
): Promise<number> => {
  const r = await raw(db)
    .prepare(
      `SELECT COUNT(*) AS n FROM ai_credit_reservations
       WHERE user_id = ?1 AND period = ?2 AND feature = ?3 AND status IN ('open','settled')`,
    )
    .bind(userId, period, feature)
    .first<{ n: number }>();
  return Number(r?.n ?? 0);
};
