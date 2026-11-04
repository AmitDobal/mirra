/**
 * Press → first frame timer for heavy routes (AMI-175). `mark` on the press,
 * `settle` from the target screen after its first painted frame. Clock is
 * injectable so node tests drive it directly.
 */
export type NavTimer = {
  /** Remember when the user asked for `key`. A newer mark replaces an older one. */
  readonly mark: (key: string) => void;
  /** Ms since the pending mark for `key` (consumed), or null when none is pending. */
  readonly settle: (key: string) => number | null;
};

const defaultNow = (): number =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

export const createNavTimer = (now: () => number = defaultNow): NavTimer => {
  const pending = new Map<string, number>();
  return {
    mark: (key) => {
      pending.set(key, now());
    },
    settle: (key) => {
      const at = pending.get(key);
      if (at === undefined) return null;
      pending.delete(key);
      return Math.max(0, Math.round(now() - at));
    },
  };
};

/** App-wide timer: keys are route-ish names such as `workout.live`. */
export const navTimer = createNavTimer();
