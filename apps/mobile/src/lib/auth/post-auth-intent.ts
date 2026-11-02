/**
 * Why the user opened auth:
 * - `paywall`: finished week-reveal (flow A) → next gate is paywall.
 * - `signin`: welcome "I already have an account" → resolve from /v1/me.
 * - `tabs`: legacy close-paywall path (resolve from /v1/me).
 * - `restore`: paywall Restore tapped while signed out → after Google, land on
 *   paywall and run restore once (no second tap).
 */
export type PostAuthIntent = "paywall" | "tabs" | "signin" | "restore";

let pending: PostAuthIntent | null = null;
let restoreResume = false;

/** Armed by post-auth when intent was `restore`; consumed once by the paywall. */
export const armRestoreResume = (): void => {
  restoreResume = true;
};

export const takeRestoreResume = (): boolean => {
  const next = restoreResume;
  restoreResume = false;
  return next;
};

export const setPostAuthIntent = (intent: PostAuthIntent): void => {
  pending = intent;
};

export const peekPostAuthIntent = (): PostAuthIntent | null => pending;

/** Read and clear so a second auth success does not re-route. */
export const takePostAuthIntent = (): PostAuthIntent | null => {
  const next = pending;
  pending = null;
  return next;
};

export const clearPostAuthIntent = (): void => {
  pending = null;
  restoreResume = false;
};
