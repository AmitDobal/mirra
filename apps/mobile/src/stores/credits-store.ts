import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { getCredits as fetchCredits, type CreditsSnapshot } from "@/lib/api/credits";
import { errorMessage, logger } from "@/lib/logger";

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const PERSIST_KEY = "mirra.credits.snapshot";

type PersistedCredits = {
  readonly snapshot: CreditsSnapshot;
  readonly savedAt: number;
};

type CreditsState = {
  readonly credits: CreditsSnapshot | null;
  readonly fetchedAt: number;
  /** Last known balance from SecureStore — instant meter before network. */
  readonly cachedCredits: CreditsSnapshot | null;
  readonly loading: boolean;
  readonly hydrate: () => Promise<void>;
  /** Cache-first GET /v1/credits with TTL + single-flight dedupe. */
  readonly ensureCredits: (opts?: { force?: boolean }) => Promise<CreditsSnapshot>;
  readonly refreshInBackground: () => void;
  readonly clear: () => Promise<void>;
};

let inflight: Promise<CreditsSnapshot> | null = null;

const isValidSnapshot = (value: unknown): value is CreditsSnapshot => {
  if (!value || typeof value !== "object") return false;
  const s = value as CreditsSnapshot;
  return typeof s.remaining === "number" && typeof s.resetsAt === "string";
};

const readPersist = async (): Promise<PersistedCredits | null> => {
  try {
    const raw = await SecureStore.getItemAsync(PERSIST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedCredits;
    if (!isValidSnapshot(parsed?.snapshot)) return null;
    return parsed;
  } catch (err) {
    logger.warn("credits.persist.read_failed", { message: errorMessage(err) });
    return null;
  }
};

const writePersist = async (snapshot: CreditsSnapshot): Promise<void> => {
  const payload: PersistedCredits = { snapshot, savedAt: Date.now() };
  try {
    await SecureStore.setItemAsync(PERSIST_KEY, JSON.stringify(payload));
  } catch (err) {
    logger.warn("credits.persist.write_failed", { message: errorMessage(err) });
  }
};

const isFresh = (fetchedAt: number) => fetchedAt > 0 && Date.now() - fetchedAt < TTL_MS;

export const useCreditsStore = create<CreditsState>((set, get) => ({
  credits: null,
  fetchedAt: 0,
  cachedCredits: null,
  loading: false,

  hydrate: async () => {
    const persisted = await readPersist();
    if (!persisted) return;
    set({ cachedCredits: persisted.snapshot });
  },

  ensureCredits: async (opts) => {
    const force = opts?.force === true;
    const { credits, fetchedAt } = get();
    if (!force && credits && isFresh(fetchedAt)) return credits;
    if (inflight) return inflight;

    set({ loading: true });
    inflight = fetchCredits()
      .then(async (next) => {
        set({
          credits: next,
          fetchedAt: Date.now(),
          cachedCredits: next,
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
      .ensureCredits({ force: true })
      .catch((err) => {
        logger.warn("credits.refresh.failed", { message: errorMessage(err) });
      });
  },

  clear: async () => {
    inflight = null;
    set({
      credits: null,
      fetchedAt: 0,
      cachedCredits: null,
      loading: false,
    });
    try {
      await SecureStore.deleteItemAsync(PERSIST_KEY);
    } catch (err) {
      logger.warn("credits.persist.delete_failed", { message: errorMessage(err) });
    }
  },
}));
