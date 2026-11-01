/** Runtime copy of training_location column on preferences. */
export const MIGRATION_005 = `
ALTER TABLE preferences ADD COLUMN training_location TEXT NOT NULL DEFAULT 'gym';
`;
