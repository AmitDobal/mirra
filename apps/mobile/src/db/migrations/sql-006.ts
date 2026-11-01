/** Plan ready vs funnel finished — do not treat generate as onboarding done. */
export const MIGRATION_006 = `
ALTER TABLE profiles ADD COLUMN plan_generated_at INTEGER;
`;
