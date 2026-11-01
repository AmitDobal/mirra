/** Meal vision fields + day rollup + analysis job cache (mirrors D1 0012, AMI-130). */
export const MIGRATION_007 = `
ALTER TABLE meals ADD COLUMN fiber_g INTEGER;
ALTER TABLE meals ADD COLUMN sugar_g INTEGER;
ALTER TABLE meals ADD COLUMN sodium_mg INTEGER;
ALTER TABLE meals ADD COLUMN ingredients_json TEXT;
ALTER TABLE meals ADD COLUMN warnings_json TEXT;
ALTER TABLE meals ADD COLUMN analysis_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE meals ADD COLUMN analysis_source TEXT;
ALTER TABLE meals ADD COLUMN estimate_confidence REAL;
CREATE TABLE IF NOT EXISTS nutrition_day_rollup (
  user_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  kcal_in INTEGER NOT NULL DEFAULT 0,
  protein_g REAL NOT NULL DEFAULT 0,
  carbs_g REAL NOT NULL DEFAULT 0,
  fat_g REAL NOT NULL DEFAULT 0,
  kcal_target INTEGER,
  workout_minutes INTEGER NOT NULL DEFAULT 0,
  sets_completed INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, local_date)
);
CREATE INDEX IF NOT EXISTS idx_rollup_user_date ON nutrition_day_rollup(user_id, local_date DESC);
CREATE TABLE IF NOT EXISTS meal_analysis_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  meal_id TEXT,
  media_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  input_json TEXT NOT NULL DEFAULT '{}',
  result_json TEXT,
  error TEXT,
  created_at INTEGER NOT NULL,
  finished_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_meal_jobs_user ON meal_analysis_jobs(user_id, created_at DESC);
`;
