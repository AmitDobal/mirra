/**
 * Pure cold-start destination after `hydrateAuthSession`.
 * Durable onboarding signal = SQLite `onboardingCompletedAt` (or in-memory mark).
 */
export type ColdStartDest =
  | "/(tabs)/today"
  | "/(onboarding)/splash"
  | "/(onboarding)/welcome";

export const resolveColdStartRoute = (opts: {
  hasSession: boolean;
  onboardingCompleted: boolean;
}): ColdStartDest => {
  if (!opts.hasSession) return "/(onboarding)/splash";
  if (opts.onboardingCompleted) return "/(tabs)/today";
  return "/(onboarding)/welcome";
};
