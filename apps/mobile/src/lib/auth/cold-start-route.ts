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

type KnownEntitlement = Exclude<EntitlementLike, null | undefined>;

/**
 * Tab guard: Zustand may still be `none` while persisted /v1/me says entitled.
 * Prefer an entitled local value; otherwise fall back to me cache.
 */
export const resolveEffectiveEntitlementStatus = (
  localStatus: EntitlementLike,
  meStatus: EntitlementLike,
): KnownEntitlement => {
  const local: KnownEntitlement =
    localStatus === null || localStatus === undefined ? "none" : localStatus;
  if (isEntitledStatus(local)) return local;
  if (meStatus && isEntitledStatus(meStatus)) return meStatus;
  return local;
};

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
  /**
   * Funnel resolver result (server /v1/me + SQLite) once hydrated; `undefined` = still
   * loading. Cold deep links skip `app/index.tsx`, so the in-memory `onboarded` flag is
   * false until this resolves (AMI-177).
   */
  readonly hydratedDest?: ColdStartDest;
};

export type TabGuardDest = Exclude<ColdStartDest, "/(tabs)/today">;

/**
 * `null` = allowed into tabs, `"pending"` = wait (render nothing, never redirect).
 * Only a hydrated funnel decision may send a user out of tabs, so an onboarded,
 * paid user is never bounced to onboarding by unhydrated local state.
 */
export const resolveTabGuard = (
  opts: TabGuardInput,
): TabGuardDest | "pending" | null => {
  if (!opts.hasSession) return "/(onboarding)/splash";
  const unlocked = opts.entitled || Boolean(opts.devPaywallSkip);
  if (opts.onboarded && unlocked) return null;
  if (opts.hydratedDest === undefined) return "pending";
  if (opts.hydratedDest === "/(tabs)/today") {
    return unlocked ? null : "/(onboarding)/paywall";
  }
  return opts.hydratedDest;
};
