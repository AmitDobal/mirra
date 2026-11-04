/**
 * Pure Pro-access + store-subscription helpers (AMI-183). No RN imports so they test in Node.
 * Pro = server trial/active/grace (fresh or cached /v1/me) or an in-session store purchase.
 * Matches the API `requirePro` gate, so the client never runs an AI preview it cannot apply.
 */

type Status = string | null | undefined;

const ENTITLED = new Set(["trial", "active", "grace"]);

export const hasProAccess = (sources: {
  readonly me?: Status;
  readonly cachedMe?: Status;
  readonly store?: Status;
}): boolean => [sources.me ?? sources.cachedMe, sources.store].some((s) => s != null && ENTITLED.has(s));

/** `android.package` in app.json (fallback when Constants has no expoConfig). */
export const ANDROID_PACKAGE = "ai.mirra.app";

/** Store page where the user manages / cancels their subscription. */
export const manageSubscriptionUrl = (os: string, androidPackage: string = ANDROID_PACKAGE): string =>
  os === "android"
    ? `https://play.google.com/store/account/subscriptions?package=${encodeURIComponent(androidPackage)}`
    : "https://apps.apple.com/account/subscriptions";
