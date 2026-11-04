/**
 * Optimistic session line (AMI-175). "Start workout" renders from the local plan
 * at once; the session row (API, else SQLite) opens in the background. Writes
 * queue behind it in order, and a newer start (or reset) drops stale results so
 * a slow open never lands on the next workout. Pure: node tests drive it.
 */
export type OpenedSession<TSource extends string> = {
  readonly sessionId: string | null;
  readonly sessionSource: TSource;
};

export type SessionLine<TSource extends string> = {
  /** Open a new session; `onOpened` fires only if no newer begin/cancel happened. */
  readonly begin: (open: () => Promise<OpenedSession<TSource>>) => Promise<void>;
  /** Drop the current line (reset): pending opens and queued writes become no-ops. */
  readonly cancel: () => void;
  /** Resolves once the current open settled (immediately when none is pending). */
  readonly ready: () => Promise<OpenedSession<TSource> | null>;
  /** Run a write after the session opened, in call order. Skipped without a session id. */
  readonly enqueue: (write: (s: OpenedSession<TSource> & { sessionId: string }) => Promise<unknown>) => Promise<void>;
  /** Resolves when every queued write so far has finished. */
  readonly drained: () => Promise<void>;
  /** Changes on every begin/cancel; lets callers detect "a newer workout started". */
  readonly generation: () => number;
};

export const createSessionLine = <TSource extends string>(
  onOpened: (s: OpenedSession<TSource>) => void,
  onError: (err: unknown) => void = () => undefined,
): SessionLine<TSource> => {
  let gen = 0;
  let opened: Promise<OpenedSession<TSource> | null> = Promise.resolve(null);
  let writes: Promise<void> = Promise.resolve();

  const begin: SessionLine<TSource>["begin"] = (open) => {
    const mine = ++gen;
    writes = Promise.resolve();
    opened = open().then(
      (s) => {
        if (mine !== gen) return null;
        onOpened(s);
        return s;
      },
      (err: unknown) => {
        onError(err);
        return null;
      },
    );
    return opened.then(() => undefined);
  };

  const enqueue: SessionLine<TSource>["enqueue"] = (write) => {
    const mine = gen;
    const session = opened;
    writes = writes.then(async () => {
      const s = await session;
      if (mine !== gen || !s?.sessionId) return;
      try {
        await write({ ...s, sessionId: s.sessionId });
      } catch (err) {
        onError(err);
      }
    });
    return writes;
  };

  return {
    begin,
    cancel: () => {
      gen += 1;
      opened = Promise.resolve(null);
      writes = Promise.resolve();
    },
    ready: () => opened,
    enqueue,
    drained: () => writes,
    generation: () => gen,
  };
};
