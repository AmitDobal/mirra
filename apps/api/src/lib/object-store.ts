import { createR2ObjectStore } from "../adapters/r2-object-store";
import type { MirraEnv } from "../env";
import { stubObjectStore, type ObjectStore } from "../ports/object-store";

/**
 * Storage factory — R2 when `MEDIA` is bound; otherwise stub.
 * Routes use `getObjectStore(env)` only (never import R2 SDK).
 */
export const getObjectStore = (env: MirraEnv): ObjectStore => {
  if (env.MEDIA) return createR2ObjectStore(env.MEDIA);
  return stubObjectStore;
};
