/**
 * Goal timeline store logic (AMI-182), free of RN / SQLite imports so `node --test` can drive it
 * with fake deps. Stale-while-revalidate: the cached body (ai-cache `goal:v1`) paints first, then
 * `GET /v1/goal` with `If-None-Match`; 304 keeps the cache. Errors never drop shown data.
 */
import type { GoalResponse } from "@mirra/contracts";
import { createStore } from "zustand/vanilla";

export type GoalFetchResult =
  | { readonly kind: "ok"; readonly body: GoalResponse; readonly etag: string | null }
  | { readonly kind: "not_modified" };

export type GoalCacheEntry = { readonly body: GoalResponse; readonly etag: string | null };

export type GoalDeps = {
  readonly fetch: (etag: string | null) => Promise<GoalFetchResult>;
  readonly restart: () => Promise<GoalResponse>;
  readonly readCache: () => Promise<GoalCacheEntry | null>;
  readonly writeCache: (entry: GoalCacheEntry) => Promise<void>;
};

export type GoalLoadStatus = "idle" | "loading" | "ready" | "error";
export type RestartResult = "ok" | "rate_limited" | "error";

export type GoalState = {
  readonly data: GoalResponse | null;
  readonly etag: string | null;
  readonly status: GoalLoadStatus;
  readonly restarting: boolean;
  /** Cache read once per session (first `load`). */
  readonly hydrated: boolean;
  readonly load: () => Promise<void>;
  /** A goal input changed (weight, workout, check-in, profile, plan chat): refetch if anyone loaded. */
  readonly invalidate: () => Promise<void>;
  readonly restart: () => Promise<RestartResult>;
};

const statusOf = (err: unknown): number | undefined =>
  typeof err === "object" && err !== null && "status" in err ? Number((err as { status: unknown }).status) : undefined;

export const createGoalStore = (deps: GoalDeps) => {
  let inflight: Promise<void> | null = null;
  /** An invalidation landed mid-request: that response may predate the change, so fetch again. */
  let again = false;

  return createStore<GoalState>()((set, get) => {
    const fetchOnce = async () => {
      if (!get().hydrated) {
        const cached = await deps.readCache().catch(() => null);
        set({ hydrated: true });
        if (cached && !get().data) set({ data: cached.body, etag: cached.etag, status: "ready" });
      }
      if (!get().data) set({ status: "loading" });
      try {
        const res = await deps.fetch(get().data ? get().etag : null);
        if (res.kind === "ok") {
          set({ data: res.body, etag: res.etag, status: "ready" });
          await deps.writeCache({ body: res.body, etag: res.etag }).catch(() => undefined);
        } else {
          set({ status: get().data ? "ready" : "error" });
        }
      } catch {
        set({ status: get().data ? "ready" : "error" });
      }
    };

    const load = (): Promise<void> => {
      if (inflight) return inflight;
      inflight = (async () => {
        do {
          again = false;
          await fetchOnce();
        } while (again);
      })().finally(() => {
        inflight = null;
      });
      return inflight;
    };

    return {
      data: null,
      etag: null,
      status: "idle",
      restarting: false,
      hydrated: false,
      load,
      invalidate: async () => {
        if (inflight) {
          again = true;
          return inflight;
        }
        if (get().status === "idle" && !get().data) return;
        return load();
      },
      restart: async () => {
        if (get().restarting) return "error";
        set({ restarting: true });
        try {
          const body = await deps.restart();
          // Restart replies without an ETag header we can read: drop it so the next GET is full.
          set({ data: body, etag: null, status: "ready" });
          await deps.writeCache({ body, etag: null }).catch(() => undefined);
          return "ok";
        } catch (err) {
          return statusOf(err) === 429 ? "rate_limited" : "error";
        } finally {
          set({ restarting: false });
        }
      },
    };
  });
};

export type GoalStore = ReturnType<typeof createGoalStore>;
