/** Runtime copy of `./002.sql` (Metro cannot import .sql raw). */
export const MIGRATION_002 = `
CREATE TABLE IF NOT EXISTS weight_logs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  kg REAL NOT NULL,
  logged_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_weight_logs_user ON weight_logs(user_id, logged_at DESC);

CREATE TABLE IF NOT EXISTS ai_response_cache (
  key TEXT PRIMARY KEY NOT NULL,
  payload_json TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  ttl_ms INTEGER NOT NULL
);
`;
