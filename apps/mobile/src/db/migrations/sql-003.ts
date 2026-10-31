/** Runtime copy of `./003.sql` (Metro cannot import .sql raw). */
export const MIGRATION_003 = `
ALTER TABLE preferences ADD COLUMN trainer_persona TEXT NOT NULL DEFAULT 'drill';
`;
