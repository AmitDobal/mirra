/**
 * Pure cold-start destination after `hydrateAuthSession`.
 * `onboardingCompleted` = SQLite `onboardingCompletedAt` (auth+paywall soft finish).
 * `planGenerated` = quiz finished / plan ready — resume week-reveal, never skip to Today.
 */
export type ColdStartDest =
  | "/(tabs)/today"
  | "/(onboarding)/splash"
  | "/(onboarding)/welcome"
  | "/(onboarding)/week-reveal";

export const resolveColdStartRoute = (opts: {
  hasSession: boolean;
  onboardingCompleted: boolean;
  planGenerated?: boolean;
}): ColdStartDest => {
  if (opts.onboardingCompleted && opts.hasSession) return "/(tabs)/today";
  if (opts.planGenerated) return "/(onboarding)/week-reveal";
  if (!opts.hasSession) return "/(onboarding)/splash";
  return "/(onboarding)/welcome";
};
