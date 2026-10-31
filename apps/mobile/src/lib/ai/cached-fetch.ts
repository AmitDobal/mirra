import { clearCached, getCached, setCached } from "@/db";
import { logger, errorMessage } from "@/lib/logger";

export const DEFAULT_MIN_REFRESH_MS = 60_000;

export type AiCacheResult<T> = {
  readonly data: T;
  /** Epoch ms the payload was fetched from the network. */
  readonly cachedAt: number;
  readonly fromCache: boolean;
  /** True when `force` was requested but the last fetch was under `minRefreshMs` ago. */
  readonly throttled: boolean;
};

export type WithAiCacheOptions<T> = {
  readonly key: string;
  readonly ttlMs: number;
  /** Skip TTL check (subject to throttle). */
  readonly force?: boolean;
  /** Min gap between forced network calls. Default 60s; `0` disables. */
  readonly minRefreshMs?: number;
  readonly fetch: () => Promise<T>;
};

const inflight = new Map<string, Promise<AiCacheResult<unknown>>>();

const safeRead = async <T>(key: string) => {
  try {
    return await getCached<T>(key);
  } catch (err) {
    logger.warn("ai.cache.read.failed", { key, message: errorMessage(err) });
    return null;
  }
};

const run = async <T>(opts: WithAiCacheOptions<T>): Promise<AiCacheResult<T>> => {
  const { key, ttlMs, force = false, minRefreshMs = DEFAULT_MIN_REFRESH_MS } = opts;
  const cached = await safeRead<T>(key);
  const age = cached ? Date.now() - cached.fetchedAt : Number.POSITIVE_INFINITY;

  if (cached && !force && age < ttlMs) {
    return { data: cached.payload, cachedAt: cached.fetchedAt, fromCache: true, throttled: false };
  }
  if (cached && force && age < minRefreshMs) {
    return { data: cached.payload, cachedAt: cached.fetchedAt, fromCache: true, throttled: true };
  }

  const data = await opts.fetch();
  let cachedAt = Date.now();
  try {
    cachedAt = await setCached(key, data, ttlMs);
  } catch (err) {
    logger.warn("ai.cache.write.failed", { key, message: errorMessage(err) });
  }
  return { data, cachedAt, fromCache: false, throttled: false };
};

/**
 * TTL cache + refresh throttle for AI endpoints (SQLite `ai_response_cache`).
 * Concurrent calls for one key share a single request.
 */
export const withAiCache = <T>(opts: WithAiCacheOptions<T>): Promise<AiCacheResult<T>> => {
  const existing = inflight.get(opts.key);
  if (existing) return existing as Promise<AiCacheResult<T>>;
  const pending = run(opts).finally(() => inflight.delete(opts.key));
  inflight.set(opts.key, pending);
  return pending;
};

export { clearCached };
