import type {
  NotificationItem,
  NotificationKind,
  NotificationPrefs,
  NotificationPrefsPatch,
  NotificationsResponse,
} from "@mirra/contracts";
import { and, desc, eq, isNull, lt, or, sql } from "drizzle-orm";

import type { AppDB } from "../db";
import { notificationPrefs, notifications } from "../db/schema";
import { notFound } from "../lib/errors";
import { newId } from "../lib/id";

type NotificationRow = typeof notifications.$inferSelect;
type PrefsRow = typeof notificationPrefs.$inferSelect;

export const UNREAD_CAP = 100;

export type NewNotification = {
  readonly kind: NotificationKind;
  readonly title: string;
  readonly body: string;
  readonly payload?: NotificationItem["payload"];
};

const parsePayload = (raw: string | null): NotificationItem["payload"] => {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" ? (value as NotificationItem["payload"]) : null;
  } catch {
    return null;
  }
};

const toItem = (row: NotificationRow): NotificationItem => ({
  id: row.id,
  kind: row.kind as NotificationKind,
  title: row.title,
  body: row.body,
  payload: parsePayload(row.payloadJson),
  readAt: row.readAt?.getTime() ?? null,
  createdAt: row.createdAt.getTime(),
});

const toPrefs = (row: PrefsRow | undefined): NotificationPrefs => ({
  inAppEnabled: row?.inAppEnabled ?? null,
  streakReminders: row?.streakReminders ?? true,
  workoutReminders: row?.workoutReminders ?? true,
  quietStart: row?.quietStart ?? null,
  quietEnd: row?.quietEnd ?? null,
  softAskDismissedAt: row?.softAskDismissedAt?.getTime() ?? null,
});

const loadPrefsRow = async (db: AppDB, userId: string): Promise<PrefsRow | undefined> => {
  const [row] = await db
    .select()
    .from(notificationPrefs)
    .where(eq(notificationPrefs.userId, userId))
    .limit(1);
  return row;
};

export const getPrefs = async (db: AppDB, userId: string): Promise<NotificationPrefs> =>
  toPrefs(await loadPrefsRow(db, userId));

/** Insert a row. Callers that fire alerts (streak cron, badges) go through here. */
export const createNotification = async (
  db: AppDB,
  userId: string,
  input: NewNotification,
  now: Date = new Date(),
): Promise<NotificationItem> => {
  const row: NotificationRow = {
    id: newId(),
    userId,
    kind: input.kind,
    title: input.title,
    body: input.body,
    payloadJson: input.payload ? JSON.stringify(input.payload) : null,
    readAt: null,
    createdAt: now,
  };
  await db.insert(notifications).values(row);
  return toItem(row);
};

const WELCOME: NewNotification = {
  kind: "system",
  title: "Mirra Alerts are on",
  body: "Streak and session nudges land here. Push notifications come later; these stay in Mirra.",
};

/** Partial update; first transition to enabled drops a welcome row so the inbox is never empty. */
export const patchPrefs = async (
  db: AppDB,
  userId: string,
  patch: NotificationPrefsPatch,
  now: Date = new Date(),
): Promise<NotificationPrefs> => {
  const before = await loadPrefsRow(db, userId);
  const set = {
    ...(patch.inAppEnabled !== undefined ? { inAppEnabled: patch.inAppEnabled } : {}),
    ...(patch.streakReminders !== undefined ? { streakReminders: patch.streakReminders } : {}),
    ...(patch.workoutReminders !== undefined ? { workoutReminders: patch.workoutReminders } : {}),
    ...(patch.quietStart !== undefined ? { quietStart: patch.quietStart } : {}),
    ...(patch.quietEnd !== undefined ? { quietEnd: patch.quietEnd } : {}),
    ...(patch.softAskDismissed ? { softAskDismissedAt: now } : {}),
    updatedAt: now,
  };
  await db
    .insert(notificationPrefs)
    .values({ userId, ...set })
    .onConflictDoUpdate({ target: notificationPrefs.userId, set });
  if (patch.inAppEnabled === true && before?.inAppEnabled !== true) {
    await createNotification(db, userId, WELCOME, now);
  }
  return getPrefs(db, userId);
};

const parseCursor = (cursor: string | undefined): { at: number; id: string } | null => {
  if (!cursor) return null;
  const dot = cursor.indexOf(".");
  const at = Number(cursor.slice(0, dot));
  return dot > 0 && Number.isFinite(at) ? { at, id: cursor.slice(dot + 1) } : null;
};

const countUnread = async (db: AppDB, userId: string): Promise<number> => {
  const capped = db
    .select({ one: sql<number>`1`.as("one") })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .limit(UNREAD_CAP)
    .as("capped");
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(capped);
  return Number(row?.n ?? 0);
};

export const listNotifications = async (
  db: AppDB,
  userId: string,
  opts: { cursor?: string; limit: number },
): Promise<NotificationsResponse> => {
  const cur = parseCursor(opts.cursor);
  const where = cur
    ? and(
        eq(notifications.userId, userId),
        or(
          lt(notifications.createdAt, new Date(cur.at)),
          and(eq(notifications.createdAt, new Date(cur.at)), lt(notifications.id, cur.id)),
        ),
      )
    : eq(notifications.userId, userId);
  const rows = await db
    .select()
    .from(notifications)
    .where(where)
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(opts.limit + 1);
  const page = rows.slice(0, opts.limit);
  const last = page[page.length - 1];
  return {
    items: page.map(toItem),
    nextCursor: rows.length > opts.limit && last ? `${last.createdAt.getTime()}.${last.id}` : null,
    unreadCount: await countUnread(db, userId),
  };
};

export const markRead = async (
  db: AppDB,
  userId: string,
  id: string,
  now: Date = new Date(),
): Promise<void> => {
  const [row] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .limit(1);
  if (!row) throw notFound("Notification not found");
  await db
    .update(notifications)
    .set({ readAt: now })
    .where(and(eq(notifications.id, id), isNull(notifications.readAt)));
};

export const markAllRead = async (
  db: AppDB,
  userId: string,
  now: Date = new Date(),
): Promise<number> => {
  const unread = and(eq(notifications.userId, userId), isNull(notifications.readAt));
  const res = await db.update(notifications).set({ readAt: now }).where(unread).returning({ id: notifications.id });
  return res.length;
};
