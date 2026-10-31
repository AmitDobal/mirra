-- Mirra local SQLite v4 — cuisines, physique target, lifestyle notes on preferences (mirrors D1 cuisine_json / physique_target / lifestyle_notes)

ALTER TABLE preferences ADD COLUMN cuisine_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE preferences ADD COLUMN physique_target TEXT;
ALTER TABLE preferences ADD COLUMN lifestyle_notes TEXT;
