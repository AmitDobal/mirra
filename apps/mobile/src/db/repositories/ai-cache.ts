import { getDb } from "../client";
import { getLocalUserId, nowMs } from "../ids";
import { parseJson, toJson } from "../json";

type CacheRow = {
  payload_json: string;
  fetched_at: number;
  ttl_ms: number;
};

export type CachedEntry<T> = {
  readonly payload: T;
  readonly fetchedAt: number;
  readonly ttlMs: number;
};

/** Scope keys per local user so account switches never share AI output. */
const scoped = (key: string): string => `${getLocalUserId()}:${key}`;

/** Read a cached AI payload (fresh or stale — caller checks `fetchedAt + ttlMs`). */
export const getCached = async <T>(key: string): Promise<CachedEntry<T> | null> => {
  const db = await getDb();
  const row = await db.getFirstAsync<CacheRow>(
    "SELECT payload_json, fetched_at, ttl_ms FROM ai_response_cache WHERE key = ?",
    scoped(key),
  );
  if (!row) return null;
  const payload = parseJson<T | null>(row.payload_json, null);
  if (payload === null) return null;
  return { payload, fetchedAt: row.fetched_at, ttlMs: row.ttl_ms };
};

export const setCached = async <T>(
  key: string,
  payload: T,
  ttlMs: number,
): Promise<number> => {
  const db = await getDb();
  const fetchedAt = nowMs();
  await db.runAsync(
    `INSERT INTO ai_response_cache (key, payload_json, fetched_at, ttl_ms)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       payload_json = excluded.payload_json,
       fetched_at = excluded.fetched_at,
       ttl_ms = excluded.ttl_ms`,
    scoped(key),
    toJson(payload),
    fetchedAt,
    ttlMs,
  );
  return fetchedAt;
};

export const clearCached = async (key: string): Promise<void> => {
  const db = await getDb();
  await db.runAsync("DELETE FROM ai_response_cache WHERE key = ?", scoped(key));
};
