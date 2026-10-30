import { getDb } from "../../db/client";

let ready: Promise<void> | null = null;

/** Open + migrate `mirra.db` once. Call from app root later. */
export const ensureMirraDb = (): Promise<void> => {
  if (!ready) {
    ready = getDb()
      .then(() => undefined)
      .catch((error: unknown) => {
        ready = null;
        throw error;
      });
  }
  return ready;
};

/** Alias kept for ticket wording. */
export const ensureDb = ensureMirraDb;
