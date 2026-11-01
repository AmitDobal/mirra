/**
 * Single-flight funnel navigation (no React Native imports → unit-testable).
 * Dedupes repeated replace to the same destination (paywall stacking races).
 */

const DEDUPE_MS = 2500;

let lastDest: string | null = null;
let lastAt = 0;
let finishInflight: Promise<void> | null = null;
/** True while Google OAuth browser is open / callback not yet routed. */
let googleHandoff = false;

/** Record dest; return false when a same-dest replace should be skipped. */
export const shouldReplaceFunnelDest = (
  dest: string,
  now = Date.now(),
  windowMs = DEDUPE_MS,
): boolean => {
  if (lastDest === dest && now - lastAt < windowMs) return false;
  lastDest = dest;
  lastAt = now;
  return true;
};

export const getFunnelNavInflight = (): Promise<void> | null => finishInflight;

/** Run `task` alone; concurrent callers await the same promise (first wins). */
export const runFunnelNavExclusive = async (
  task: () => Promise<void>,
): Promise<void> => {
  if (finishInflight) return finishInflight;
  finishInflight = task().finally(() => {
    finishInflight = null;
  });
  return finishInflight;
};

export const markGoogleAuthHandoff = (): void => {
  googleHandoff = true;
};

export const clearGoogleAuthHandoff = (): void => {
  googleHandoff = false;
};

export const isGoogleAuthHandoff = (): boolean => googleHandoff;

/** Test helper — reset module locks between cases. */
export const resetFunnelNavForTests = (): void => {
  lastDest = null;
  lastAt = 0;
  finishInflight = null;
  googleHandoff = false;
};
