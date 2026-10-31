-- Mirra local SQLite v3 — trainer persona on preferences (mirrors D1 0006)

ALTER TABLE preferences ADD COLUMN trainer_persona TEXT NOT NULL DEFAULT 'drill';
