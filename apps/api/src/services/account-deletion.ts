import { eq, or } from "drizzle-orm";

import type { AppDB } from "../db";
import {
  aiCreditLedger,
  aiCreditPeriods,
  aiCreditReservations,
  aiUsageDaily,
  aiUsageEvents,
  auditLog,
  mediaObjects,
  paymentEvents,
  referralCodes,
  referralRedemptions,
  users,
} from "../db/schema";
import type { ObjectStore } from "../ports/object-store";

/** R2 key prefixes written by `ObjectStore.createUploadUrl` (`{kind}/{userId}/{mediaId}`). */
const MEDIA_KINDS = ["meal", "mirror", "progress"] as const;

export type AccountDeletionResult = {
  /** R2 objects targeted (media_objects keys). */
  mediaKeys: number;
};

/** Delete every R2 object the user owns: tracked keys first, then per-kind prefix sweep. */
const wipeMedia = async (db: AppDB, store: ObjectStore, userId: string): Promise<number> => {
  const rows = await db
    .select({ r2Key: mediaObjects.r2Key })
    .from(mediaObjects)
    .where(eq(mediaObjects.userId, userId));
  const keys = new Set(rows.map((r) => r.r2Key));
  // Prefix sweep catches orphans (reserved/uploaded but never confirmed rows).
  const prefixes = [...MEDIA_KINDS.map((k) => `${k}/${userId}/`), ...keys];
  await Promise.all(prefixes.map((p) => store.deletePrefix(p)));
  return keys.size;
};

/**
 * Hard-delete a user and all personal data (docs/03-engineering/account-deletion.md).
 *
 * Order: R2 media -> non-FK tables -> anonymize payment_events -> DELETE users
 * (FK cascades cover profiles, prefs, sessions, accounts, plans, meals, ...).
 * Safe to retry: every step is idempotent; R2 goes first so a mid-way failure
 * never leaves orphaned bytes without a row pointing at them.
 */
export const deleteAccount = async (
  db: AppDB,
  store: ObjectStore,
  userId: string,
): Promise<AccountDeletionResult> => {
  const mediaKeys = await wipeMedia(db, store, userId);

  await db.batch([
    db.delete(aiUsageEvents).where(eq(aiUsageEvents.userId, userId)),
    db.delete(aiUsageDaily).where(eq(aiUsageDaily.userId, userId)),
    db.delete(aiCreditPeriods).where(eq(aiCreditPeriods.userId, userId)),
    db.delete(aiCreditReservations).where(eq(aiCreditReservations.userId, userId)),
    db.delete(aiCreditLedger).where(eq(aiCreditLedger.userId, userId)),
    db.delete(referralCodes).where(eq(referralCodes.userId, userId)),
    db
      .delete(referralRedemptions)
      .where(
        or(
          eq(referralRedemptions.referrerUserId, userId),
          eq(referralRedemptions.refereeUserId, userId),
        ),
      ),
    db.delete(auditLog).where(eq(auditLog.userId, userId)),
    db
      .update(paymentEvents)
      .set({ userId: null })
      .where(eq(paymentEvents.userId, userId)),
    db.delete(users).where(eq(users.id, userId)),
  ]);

  return { mediaKeys };
};
