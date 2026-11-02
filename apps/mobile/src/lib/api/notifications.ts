import { apiFetch } from "./client";

/** Mirrors contracts `NotificationKindSchema`. */
export type NotificationKind =
  | "streak_at_risk"
  | "badge_unlock"
  | "coach"
  | "workout"
  | "nutrition"
  | "system";

/** Mirrors contracts `NotificationSchema`. */
export type NotificationItem = {
  readonly id: string;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly body: string;
  readonly payload: {
    readonly route?: string;
    readonly label?: string;
    readonly chip?: string;
  } | null;
  readonly readAt: number | null;
  readonly createdAt: number;
};

/** Mirrors contracts `NotificationsResponseSchema`. */
export type NotificationsPage = {
  readonly items: readonly NotificationItem[];
  readonly nextCursor: string | null;
  readonly unreadCount: number;
};

/** Mirrors contracts `NotificationPrefsSchema`. `inAppEnabled: null` = soft ask unanswered. */
export type NotificationPrefs = {
  readonly inAppEnabled: boolean | null;
  readonly streakReminders: boolean;
  readonly workoutReminders: boolean;
  readonly quietStart: string | null;
  readonly quietEnd: string | null;
  readonly softAskDismissedAt: number | null;
};

export type NotificationPrefsPatch = Partial<
  Pick<NotificationPrefs, "inAppEnabled" | "streakReminders" | "workoutReminders">
> & { readonly softAskDismissed?: true };

export const getNotifications = (cursor?: string) =>
  apiFetch<NotificationsPage>("/v1/notifications", { query: { cursor }, quiet: true });

export const markNotificationRead = (id: string) =>
  apiFetch<{ ok: true }>(`/v1/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
    quiet: true,
  });

export const markAllNotificationsRead = () =>
  apiFetch<{ updated: number }>("/v1/notifications/read-all", { method: "POST", quiet: true });

export const getNotificationPrefs = () =>
  apiFetch<NotificationPrefs>("/v1/notification-prefs", { quiet: true });

export const patchNotificationPrefs = (patch: NotificationPrefsPatch) =>
  apiFetch<NotificationPrefs>("/v1/notification-prefs", { method: "PATCH", body: patch, quiet: true });
