/**
 * One complete per session, then RPE as a plain update (AMI-172). The live HUD "Finish"
 * completes before S17 shows the RPE grid, so "Done" must not complete again: it waits
 * for the first complete (tier changes) and saves a changed RPE on its own.
 * Pure: persistence is injected so node tests drive it directly.
 */
export type FinishDeps<TChange> = {
  readonly complete: (sessionId: string, rpe: number | null) => Promise<readonly TChange[]>;
  readonly saveRpe: (sessionId: string, rpe: number) => Promise<void>;
};

export type FinishView<TChange> = {
  readonly sessionId: () => string | null;
  readonly rpe: () => number | null;
  /** First tier promotions for this session (only called with a non-empty list). */
  readonly onTierChanges: (sessionId: string, changes: readonly TChange[]) => void;
};

type Completion = { readonly sessionId: string; readonly done: Promise<void>; savedRpe: number | null };

export const createFinisher = <TChange>(deps: FinishDeps<TChange>, view: FinishView<TChange>) => {
  let completion: Completion | null = null;
  let rpeWrite: Promise<void> = Promise.resolve();

  /** True once this session has a complete in flight or done. */
  const started = (sessionId: string | null): boolean =>
    sessionId !== null && completion?.sessionId === sessionId;

  const finish = async (): Promise<void> => {
    const sessionId = view.sessionId();
    if (!sessionId) return;
    if (!started(sessionId)) {
      const rpe = view.rpe();
      const done = deps.complete(sessionId, rpe).then((changes) => {
        if (changes.length) view.onTierChanges(sessionId, changes);
      });
      completion = { sessionId, done, savedRpe: rpe };
    }
    const current = completion!;
    await current.done;
    // Serialize RPE writes so a double tap never saves out of order.
    rpeWrite = rpeWrite.then(async () => {
      const rpe = view.rpe();
      if (rpe == null || rpe === current.savedRpe || view.sessionId() !== sessionId) return;
      current.savedRpe = rpe;
      await deps.saveRpe(sessionId, rpe);
    });
    await rpeWrite;
  };

  return { finish, started };
};
