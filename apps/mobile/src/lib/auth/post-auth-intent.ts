/**
 * Why the user opened auth:
 * - `paywall`: finished week-reveal (flow A) → next gate is paywall.
 * - `signin`: welcome "I already have an account" → resolve from /v1/me.
 * - `tabs`: legacy close-paywall path (resolve from /v1/me).
 */
export type PostAuthIntent = "paywall" | "tabs" | "signin";

let pending: PostAuthIntent | null = null;

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
};
