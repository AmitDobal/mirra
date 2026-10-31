import { eq } from "drizzle-orm";

import type { AppDB } from "../db";
import { users } from "../db/schema";
import { toDateString } from "../lib/dates";

const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_HISTORY_WINDOW_DAYS = 21;

export type UserTenure = {
  /** ISO calendar date (YYYY-MM-DD, UTC) the user joined; null if the row is missing. */
  joinedAt: string | null;
  /** Whole days since join, min 0. */
  tenureDays: number;
};

/** Floor days between `joinedMs` and `nowMs`, never negative. */
export const tenureDaysFrom = (joinedMs: number, nowMs = Date.now()): number =>
  Math.max(0, Math.floor((nowMs - joinedMs) / DAY_MS));

/**
 * How many days of history to summarise:
 * <7d tenure -> tenure (min 1), <14 -> 7, <21 -> 14, else 21 (cap).
 */
export const historyWindowDays = (tenureDays: number): number => {
  if (tenureDays < 7) return tenureDays || 1;
  if (tenureDays < 14) return 7;
  if (tenureDays < 21) return 14;
  return MAX_HISTORY_WINDOW_DAYS;
};

/** `Joined YYYY-MM-DD (Nd)`; null when the join date is unknown. */
export const tenureLine = (t: UserTenure): string | null =>
  t.joinedAt ? `Joined ${t.joinedAt} (${t.tenureDays}d)` : null;

export const loadUserTenure = async (db: AppDB, userId: string): Promise<UserTenure> => {
  const [row] = await db
    .select({ createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) return { joinedAt: null, tenureDays: 0 };
  const joinedMs = row.createdAt instanceof Date ? row.createdAt.getTime() : Number(row.createdAt);
  return {
    joinedAt: toDateString(new Date(joinedMs)),
    tenureDays: tenureDaysFrom(joinedMs),
  };
};
