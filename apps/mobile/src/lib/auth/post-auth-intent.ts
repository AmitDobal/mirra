/** Where to send the user after Google (or soft) auth from paywall/You. */
export type PostAuthIntent = "paywall" | "tabs";

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
