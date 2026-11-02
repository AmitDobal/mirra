import type { Streak, StreakKind, StreaksResponse } from "@mirra/contracts";
import { and, eq, gte } from "drizzle-orm";

import type { AppDB } from "../db";
import { checkIns, userStreaks } from "../db/schema";
import { addDays } from "../lib/dates";
import { computeStreak, STREAK_LOOKBACK_DAYS, viewStreak } from "../lib/streak-math";
import { awardKineticBadgesSafe } from "./badges";
import { localTodayFor } from "./attendance";

type StreakRow = typeof userStreaks.$inferSelect;

/** Check-in days that count: anything except `skipped` (matches `history-summary`). */
const loadCheckInDates = async (db: AppDB, userId: string, today: string): Promise<string[]> => {
  const rows = await db
    .select({ localDate: checkIns.localDate, status: checkIns.status })
    .from(checkIns)
    .where(
      and(
        eq(checkIns.userId, userId),
        gte(checkIns.localDate, addDays(today, -STREAK_LOOKBACK_DAYS)),
      ),
    );
  return rows.filter((r) => r.status !== "skipped").map((r) => r.localDate);
};

/** Recompute the cached `check_in` streak from `check_ins` and upsert it. `best_count` only grows. */
export const recomputeCheckInStreak = async (
  db: AppDB,
  userId: string,
  today: string,
  now: Date = new Date(),
): Promise<StreakRow> => {
  const { current, lastActiveDate } = computeStreak(
    await loadCheckInDates(db, userId, today),
    today,
  );
  const [existing] = await db
    .select({ best: userStreaks.bestCount })
    .from(userStreaks)
    .where(and(eq(userStreaks.userId, userId), eq(userStreaks.kind, "check_in")))
    .limit(1);
  const bestCount = Math.max(existing?.best ?? 0, current);
  const [row] = await db
    .insert(userStreaks)
    .values({
      userId,
      kind: "check_in",
      currentCount: current,
      bestCount,
      lastActiveDate,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [userStreaks.userId, userStreaks.kind],
      set: { currentCount: current, bestCount, lastActiveDate, updatedAt: now },
    })
    .returning();
  await awardKineticBadgesSafe(db, userId, bestCount);
  return row as StreakRow;
};

/** Best-effort for write paths (check-in): never fails the caller. */
export const recomputeCheckInStreakSafe = async (db: AppDB, userId: string): Promise<void> => {
  try {
    await recomputeCheckInStreak(db, userId, await localTodayFor(db, userId));
  } catch (err) {
    console.warn("[streaks] recompute skipped", err);
  }
};

const toStreak = (kind: StreakKind, row: StreakRow, today: string): Streak => {
  const { current, fire } = viewStreak(row, today);
  return {
    kind,
    current,
    best: row.bestCount,
    lastActiveDate: row.lastActiveDate,
    freezeRemaining: row.freezeRemaining,
    fire,
  };
};

/** Cached rows with a read-time broken-streak view. A user with no row yet is backfilled once. */
export const loadStreaks = async (db: AppDB, userId: string): Promise<StreaksResponse> => {
  const today = await localTodayFor(db, userId);
  const rows = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId));
  const checkIn =
    rows.find((r) => r.kind === "check_in") ?? (await recomputeCheckInStreak(db, userId, today));
  return { today, streaks: [toStreak("check_in", checkIn, today)] };
};
