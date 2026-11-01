import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import {
  getMe as fetchMe,
  type MeAccount,
  type MeEntitlement,
  type MeResponse,
  type MeUser,
} from "@/lib/api/me";
import { errorMessage, logger } from "@/lib/logger";

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const PERSIST_KEY = "mirra.me.identity";

type PersistedIdentity = {
  readonly user: MeUser;
  readonly accounts: readonly MeAccount[];
  readonly entitlement: MeEntitlement | null;
  readonly savedAt: number;
};

type MeState = {
  readonly me: MeResponse | null;
  readonly fetchedAt: number;
  /** Identity from SecureStore — instant hero before network. */
  readonly cachedUser: MeUser | null;
  readonly cachedAccounts: readonly MeAccount[];
  readonly cachedEntitlement: MeEntitlement | null;
  readonly loading: boolean;
  readonly hydrate: () => Promise<void>;
  /** Cache-first GET /v1/me with TTL + single-flight dedupe. */
  readonly ensureMe: (opts?: { force?: boolean }) => Promise<MeResponse>;
  /** Background refresh; keeps existing cache on failure. */
  readonly refreshInBackground: () => void;
  readonly clear: () => Promise<void>;
};

let inflight: Promise<MeResponse> | null = null;

const readPersist = async (): Promise<PersistedIdentity | null> => {
  try {
    const raw = await SecureStore.getItemAsync(PERSIST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedIdentity;
    if (!parsed?.user?.id) return null;
    return parsed;
  } catch (err) {
    logger.warn("me.persist.read_failed", { message: errorMessage(err) });
    return null;
  }
};

const writePersist = async (me: MeResponse): Promise<void> => {
  const payload: PersistedIdentity = {
    user: me.user,
    accounts: me.accounts ?? [],
    entitlement: me.entitlement,
    savedAt: Date.now(),
  };
  try {
    await SecureStore.setItemAsync(PERSIST_KEY, JSON.stringify(payload));
  } catch (err) {
    logger.warn("me.persist.write_failed", { message: errorMessage(err) });
  }
};

const isFresh = (fetchedAt: number) => fetchedAt > 0 && Date.now() - fetchedAt < TTL_MS;

export const useMeStore = create<MeState>((set, get) => ({
  me: null,
  fetchedAt: 0,
  cachedUser: null,
  cachedAccounts: [],
  cachedEntitlement: null,
  loading: false,

  hydrate: async () => {
    const persisted = await readPersist();
    if (!persisted) return;
    set({
      cachedUser: persisted.user,
      cachedAccounts: persisted.accounts,
      cachedEntitlement: persisted.entitlement,
    });
  },

  ensureMe: async (opts) => {
    const force = opts?.force === true;
    const { me, fetchedAt } = get();
    if (!force && me && isFresh(fetchedAt)) return me;
    if (inflight) return inflight;

    set({ loading: true });
    inflight = fetchMe()
      .then(async (next) => {
        set({
          me: next,
          fetchedAt: Date.now(),
          cachedUser: next.user,
          cachedAccounts: next.accounts ?? [],
          cachedEntitlement: next.entitlement,
          loading: false,
        });
        await writePersist(next);
        return next;
      })
      .catch((err) => {
        set({ loading: false });
        throw err;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  },

  refreshInBackground: () => {
    void get()
      .ensureMe({ force: true })
      .catch((err) => {
        logger.warn("me.refresh.failed", { message: errorMessage(err) });
      });
  },

  clear: async () => {
    inflight = null;
    set({
      me: null,
      fetchedAt: 0,
      cachedUser: null,
      cachedAccounts: [],
      cachedEntitlement: null,
      loading: false,
    });
    try {
      await SecureStore.deleteItemAsync(PERSIST_KEY);
    } catch (err) {
      logger.warn("me.persist.delete_failed", { message: errorMessage(err) });
    }
  },
}));
