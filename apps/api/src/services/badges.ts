import type { BadgeDefinition, BadgesResponse, UserBadge } from "@mirra/contracts";
import { and, asc, eq } from "drizzle-orm";

import type { AppDB } from "../db";
import { badgeDefinitions, userBadges, userStreaks } from "../db/schema";
import {
  currentRankIdForBest,
  nextRankIdForBest,
  parseStreakGteRule,
} from "../lib/kinetic-ranks";
import { createNotification } from "./notifications";

type DefRow = typeof badgeDefinitions.$inferSelect;

const toDefinition = (row: DefRow): BadgeDefinition | null => {
  const thresholdDays = parseStreakGteRule(row.ruleJson);
  if (thresholdDays === null) return null;
  return {
    id: row.id,
    ladder: row.ladder as BadgeDefinition["ladder"],
    tier: row.tier,
    title: row.title,
    thresholdDays,
    stitchAssetKey: row.stitchAssetKey ?? null,
  };
};

const loadKineticDefinitions = async (db: AppDB): Promise<BadgeDefinition[]> => {
  const rows = await db
    .select()
    .from(badgeDefinitions)
    .where(eq(badgeDefinitions.ladder, "kinetic_rank"))
    .orderBy(asc(badgeDefinitions.tier));
  return rows.map(toDefinition).filter((d): d is BadgeDefinition => d !== null);
};

const loadUnlocked = async (db: AppDB, userId: string): Promise<UserBadge[]> => {
  const rows = await db.select().from(userBadges).where(eq(userBadges.userId, userId));
  return rows.map((r) => ({ badgeId: r.badgeId, unlockedAt: r.unlockedAt.getTime() }));
};

const loadBestStreak = async (db: AppDB, userId: string): Promise<number> => {
  const [row] = await db
    .select({ best: userStreaks.bestCount })
    .from(userStreaks)
    .where(and(eq(userStreaks.userId, userId), eq(userStreaks.kind, "check_in")))
    .limit(1);
  return row?.best ?? 0;
};

/** Award kinetic ranks when `bestStreak` crosses thresholds. Idempotent insert-ignore. */
export const awardKineticBadges = async (
  db: AppDB,
  userId: string,
  bestStreak: number,
  now: Date = new Date(),
): Promise<void> => {
  const defs = await loadKineticDefinitions(db);
  if (defs.length === 0) return;

  const existing = new Set((await loadUnlocked(db, userId)).map((u) => u.badgeId));

  for (const def of defs) {
    if (bestStreak < def.thresholdDays || existing.has(def.id)) continue;
    await db
      .insert(userBadges)
      .values({ userId, badgeId: def.id, unlockedAt: now, metaJson: null })
      .onConflictDoNothing();
    existing.add(def.id);
    await createNotification(db, userId, {
      kind: "badge_unlock",
      title: `${def.title} unlocked`,
      body: `You hit a ${def.thresholdDays}-day best streak. Kinetic rank ${def.title} is yours.`,
      payload: { chip: def.title, route: "/kinetic-rank", label: "View rank" },
    });
  }
};

export const awardKineticBadgesSafe = async (
  db: AppDB,
  userId: string,
  bestStreak: number,
): Promise<void> => {
  try {
    await awardKineticBadges(db, userId, bestStreak);
  } catch (err) {
    console.warn("[badges] award skipped", err);
  }
};

export const loadBadges = async (db: AppDB, userId: string): Promise<BadgesResponse> => {
  const definitions = await loadKineticDefinitions(db);
  const unlocked = await loadUnlocked(db, userId);
  const bestStreak = await loadBestStreak(db, userId);
  const tiers = definitions.map((d) => ({ id: d.id, threshold: d.thresholdDays }));
  return {
    definitions,
    unlocked,
    bestStreak,
    currentRankId: currentRankIdForBest(tiers, bestStreak),
    nextRankId: nextRankIdForBest(tiers, bestStreak),
  };
};
