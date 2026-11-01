/**
 * Pure allowlist for Dev Tester + paywall soft-skip. Kept free of Expo imports
 * so it can be unit-tested with `node --test`.
 *
 * Open only for local dev (`__DEV__`) or builds that set
 * `EXPO_PUBLIC_ALLOW_DEV_AUTH=true` (EAS Update day-test). App Store builds
 * leave the flag unset, so they stay hard-gated.
 */
export const isDevTesterEnabled = (isDev: boolean, allowDevAuth: boolean): boolean =>
  isDev || allowDevAuth;

export const canSoftSkipPaywallFor = (
  isDev: boolean,
  allowDevAuth: boolean,
  hasUser: boolean,
): boolean => isDevTesterEnabled(isDev, allowDevAuth) && hasUser;
