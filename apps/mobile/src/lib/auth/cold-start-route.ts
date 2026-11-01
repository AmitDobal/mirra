/**
 * Pure funnel routing (no React Native imports → unit-testable with `node --test`).
 *
 * Rules (docs/03-engineering/auth-onboarding-paywall-gates.md):
 * - Tabs need: session + onboarded + entitled (trial counts).
 * - `serverOnboarded` = GET /v1/me `onboardingCompleted` (null = unknown/offline).
 * - `localCompleted` = SQLite `onboardingCompletedAt` / store flag (paywall finished).
 */
export type ColdStartDest =
  | "/(tabs)/today"
  | "/(onboarding)/splash"
  | "/(onboarding)/welcome"
  | "/(onboarding)/goal"
  | "/(onboarding)/week-reveal"
  | "/(onboarding)/paywall";

export type EntitlementLike =
  | "trial"
  | "active"
  | "expired"
  | "grace"
  | "none"
  | null
  | undefined;

/** Trial, paid and grace periods unlock the app. */
export const isEntitledStatus = (status: EntitlementLike): boolean =>
  status === "trial" || status === "active" || status === "grace";

export type FunnelInput = {
  readonly hasSession: boolean;
  readonly serverOnboarded: boolean | null;
  readonly localCompleted: boolean;
  /** Quiz finished / plan ready locally (resume reveal, never skip to Today). */
  readonly planGenerated: boolean;
  readonly entitled: boolean;
  /** User already passed week-reveal (Start CTA) → next gate is paywall. */
  readonly revealSeen?: boolean;
  /** Fresh Google sign-in (welcome "I already have an account" or reveal auth). */
  readonly afterSignIn?: boolean;
};

export const resolveColdStartRoute = (opts: FunnelInput): ColdStartDest => {
  if (!opts.hasSession) {
    return opts.planGenerated
      ? "/(onboarding)/week-reveal"
      : "/(onboarding)/splash";
  }

  const onboarded = opts.serverOnboarded === true || opts.localCompleted;
  if (onboarded && opts.entitled) return "/(tabs)/today";

  if (onboarded) {
    // Returning but unentitled (D/H) or mid-funnel with a stale server flag (G).
    if (opts.revealSeen || opts.afterSignIn || opts.localCompleted) {
      return "/(onboarding)/paywall";
    }
    return opts.planGenerated
      ? "/(onboarding)/week-reveal"
      : "/(onboarding)/paywall";
  }

  if (opts.revealSeen) return "/(onboarding)/paywall";
  if (opts.planGenerated) return "/(onboarding)/week-reveal";
  return opts.afterSignIn ? "/(onboarding)/goal" : "/(onboarding)/welcome";
};

export type TabGuardInput = {
  readonly hasSession: boolean;
  readonly onboarded: boolean;
  readonly entitled: boolean;
  /** `__DEV__` soft-skip of the paywall only. */
  readonly devPaywallSkip?: boolean;
};

export type TabGuardDest = Exclude<ColdStartDest, "/(tabs)/today">;

/** `null` = allowed into tabs. */
export const resolveTabGuard = (opts: TabGuardInput): TabGuardDest | null => {
  if (!opts.hasSession) return "/(onboarding)/splash";
  if (!opts.onboarded) return "/(onboarding)/welcome";
  if (!opts.entitled && !opts.devPaywallSkip) return "/(onboarding)/paywall";
  return null;
};
