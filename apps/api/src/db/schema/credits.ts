import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const nowMs = sql`(unixepoch() * 1000)`;

/**
 * Rollup per (user, UTC month). Cheap PK read + the atomic guard for reserve.
 * Invariant: sum(ledger.delta for period) = granted + bonus - spent - reserved.
 */
export const aiCreditPeriods = sqliteTable(
  "ai_credit_periods",
  {
    userId: text("user_id").notNull(),
    period: text("period").notNull(),
    granted: integer("granted").notNull().default(0),
    bonus: integer("bonus").notNull().default(0),
    spent: integer("spent").notNull().default(0),
    reserved: integer("reserved").notNull().default(0),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  },
  (t) => [primaryKey({ columns: [t.userId, t.period] })],
);

/** Short-lived holds. status: open | settled | released | expired. mode: shadow | enforce. */
export const aiCreditReservations = sqliteTable(
  "ai_credit_reservations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    period: text("period").notNull(),
    feature: text("feature").notNull(),
    creditsReserved: integer("credits_reserved").notNull(),
    creditsSettled: integer("credits_settled"),
    status: text("status").notNull(),
    mode: text("mode").notNull(),
    usageEventId: text("usage_event_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    settledAt: integer("settled_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("ai_credit_reservations_user_status_idx").on(t.userId, t.status),
    index("ai_credit_reservations_user_period_feature_idx").on(t.userId, t.period, t.feature),
  ],
);

/**
 * Append-only. Never UPDATE or DELETE rows.
 * kind: monthly_grant | reserve | settle | release | referral | admin
 * reserve is negative, release/grant/referral positive, settle is a 0-delta marker.
 */
export const aiCreditLedger = sqliteTable(
  "ai_credit_ledger",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    period: text("period").notNull(),
    delta: integer("delta").notNull(),
    kind: text("kind").notNull(),
    feature: text("feature"),
    reservationId: text("reservation_id"),
    refId: text("ref_id"),
    idempotencyKey: text("idempotency_key"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  },
  (t) => [
    index("ai_credit_ledger_user_period_idx").on(t.userId, t.period),
    uniqueIndex("ai_credit_ledger_user_idem_uq").on(t.userId, t.idempotencyKey),
  ],
);

export const referralCodes = sqliteTable(
  "referral_codes",
  {
    userId: text("user_id").primaryKey(),
    code: text("code").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  },
  (t) => [uniqueIndex("referral_codes_code_uq").on(t.code)],
);

/** status: pending | awarded | rejected. One redemption per referee. */
export const referralRedemptions = sqliteTable(
  "referral_redemptions",
  {
    id: text("id").primaryKey(),
    referrerUserId: text("referrer_user_id").notNull(),
    refereeUserId: text("referee_user_id").notNull(),
    status: text("status").notNull(),
    creditsAwarded: integer("credits_awarded").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(nowMs),
  },
  (t) => [uniqueIndex("referral_redemptions_referee_uq").on(t.refereeUserId)],
);
