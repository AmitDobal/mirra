/** Runtime copy of `./004.sql` (Metro cannot import .sql raw). */
export const MIGRATION_004 = `
ALTER TABLE preferences ADD COLUMN cuisine_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE preferences ADD COLUMN physique_target TEXT;
ALTER TABLE preferences ADD COLUMN lifestyle_notes TEXT;
`;
