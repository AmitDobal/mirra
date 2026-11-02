import { create } from "zustand";

import {
  getNotificationPrefs,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  patchNotificationPrefs,
  type NotificationItem,
  type NotificationPrefs,
  type NotificationPrefsPatch,
} from "@/lib/api";

type AlertsState = {
  readonly items: readonly NotificationItem[];
  readonly nextCursor: string | null;
  readonly unreadCount: number;
  readonly prefs: NotificationPrefs | null;
  readonly loading: boolean;
  readonly error: boolean;
  /** Session-only: Today soft-ask sheet already shown or answered. */
  readonly softAskShown: boolean;
  readonly hydrate: () => Promise<void>;
  readonly loadMore: () => Promise<void>;
  readonly markRead: (id: string) => void;
  readonly markAllRead: () => void;
  readonly updatePrefs: (patch: NotificationPrefsPatch) => Promise<void>;
  readonly enable: () => Promise<void>;
  readonly dismissSoftAsk: () => Promise<void>;
  readonly markSoftAskShown: () => void;
};

/** Soft ask is due until the user enables, disables or taps "Not now". */
export const selectSoftAskDue = (s: Pick<AlertsState, "prefs">): boolean =>
  s.prefs != null && s.prefs.inAppEnabled === null && s.prefs.softAskDismissedAt === null;

export const useAlertsStore = create<AlertsState>((set, get) => ({
  items: [],
  nextCursor: null,
  unreadCount: 0,
  prefs: null,
  loading: false,
  error: false,
  softAskShown: false,

  hydrate: async () => {
    set({ loading: true, error: false });
    try {
      const [page, prefs] = await Promise.all([getNotifications(), getNotificationPrefs()]);
      set({
        items: page.items,
        nextCursor: page.nextCursor,
        unreadCount: page.unreadCount,
        prefs,
        loading: false,
      });
    } catch {
      set({ loading: false, error: true });
    }
  },

  loadMore: async () => {
    const { nextCursor, items, loading } = get();
    if (!nextCursor || loading) return;
    set({ loading: true });
    try {
      const page = await getNotifications(nextCursor);
      set({
        items: [...items, ...page.items],
        nextCursor: page.nextCursor,
        unreadCount: page.unreadCount,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  markRead: (id) => {
    const target = get().items.find((n) => n.id === id);
    if (!target || target.readAt != null) return;
    const now = Date.now();
    set((s) => ({
      items: s.items.map((n) => (n.id === id ? { ...n, readAt: now } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
    void markNotificationRead(id).catch(() => void get().hydrate());
  },

  markAllRead: () => {
    const now = Date.now();
    set((s) => ({
      items: s.items.map((n) => (n.readAt == null ? { ...n, readAt: now } : n)),
      unreadCount: 0,
    }));
    void markAllNotificationsRead().catch(() => void get().hydrate());
  },

  updatePrefs: async (patch) => {
    try {
      const prefs = await patchNotificationPrefs(patch);
      set({ prefs });
    } catch {
      /* keep the last known prefs; the toggle snaps back on next render */
    }
  },

  enable: async () => {
    await get().updatePrefs({ inAppEnabled: true });
    // The server drops a welcome row on first enable; refresh so the inbox shows it.
    await get().hydrate();
  },

  dismissSoftAsk: async () => {
    set({ softAskShown: true });
    if (get().prefs?.inAppEnabled === null) await get().updatePrefs({ softAskDismissed: true });
  },

  markSoftAskShown: () => set({ softAskShown: true }),
}));
