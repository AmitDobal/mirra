-- Mirra local SQLite v1 — lean mirror of docs/03-engineering/d1-schema.md

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY NOT NULL,
  applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY NOT NULL,
  sex TEXT,
  age_years INTEGER,
  height_cm REAL,
  weight_kg REAL,
  goal_weight_kg REAL,
  pace TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  onboarding_completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS preferences (
  user_id TEXT PRIMARY KEY NOT NULL,
  primary_goal TEXT NOT NULL,
  experience TEXT NOT NULL,
  equipment_json TEXT NOT NULL DEFAULT '[]',
  train_days_json TEXT NOT NULL DEFAULT '[1,3,5]',
  session_minutes INTEGER NOT NULL DEFAULT 45,
  diet_tags_json TEXT NOT NULL DEFAULT '[]',
  foods_avoid TEXT,
  units TEXT NOT NULL DEFAULT 'metric',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  status TEXT NOT NULL,
  week_start TEXT NOT NULL,
  summary_json TEXT NOT NULL DEFAULT '{}',
  source TEXT NOT NULL,
  parent_plan_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_days (
  id TEXT PRIMARY KEY NOT NULL,
  plan_id TEXT NOT NULL,
  day_index INTEGER NOT NULL,
  date TEXT NOT NULL,
  kind TEXT NOT NULL,
  label TEXT,
  workout_id TEXT
);

CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY NOT NULL,
  plan_id TEXT NOT NULL,
  title TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  focus TEXT,
  calorie_est INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id TEXT PRIMARY KEY NOT NULL,
  workout_id TEXT NOT NULL,
  name TEXT NOT NULL,
  cue TEXT,
  target_sets INTEGER NOT NULL,
  target_reps TEXT NOT NULL,
  rest_sec INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  swap_group TEXT
);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  workout_id TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  rpe INTEGER,
  notes TEXT,
  totals_json TEXT
);

CREATE TABLE IF NOT EXISTS set_logs (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  exercise_id TEXT,
  exercise_name TEXT NOT NULL,
  set_index INTEGER NOT NULL,
  weight_kg REAL,
  reps INTEGER,
  completed INTEGER NOT NULL DEFAULT 1,
  logged_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS meals (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  eaten_at INTEGER NOT NULL,
  name TEXT NOT NULL,
  meal_slot TEXT NOT NULL DEFAULT 'snack',
  kcal INTEGER NOT NULL DEFAULT 0,
  protein_g REAL NOT NULL DEFAULT 0,
  carbs_g REAL NOT NULL DEFAULT 0,
  fat_g REAL NOT NULL DEFAULT 0,
  media_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS check_ins (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  local_date TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  triggered_rebuild INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS progress_photos (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  local_uri TEXT NOT NULL,
  pose TEXT NOT NULL,
  taken_at INTEGER NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS entitlements (
  user_id TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL,
  product_id TEXT,
  rc_app_user_id TEXT,
  expires_at INTEGER,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plans_user_version ON plans(user_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_plan_days_plan ON plan_days(plan_id, day_index);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON workout_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_meals_user ON meals(user_id, eaten_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_check_ins_user_date ON check_ins(user_id, local_date);
CREATE INDEX IF NOT EXISTS idx_photos_user ON progress_photos(user_id, taken_at DESC);
