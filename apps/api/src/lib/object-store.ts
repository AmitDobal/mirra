import type { MirraEnv } from "../env";
import { stubObjectStore, type ObjectStore } from "../ports/object-store";

/**
 * Storage factory — today stub; wire `createR2ObjectStore(env.MEDIA)` here
 * without touching upload routes beyond `getObjectStore(env)`.
 */
export const getObjectStore = (_env: MirraEnv): ObjectStore => {
  // Future: if (env.MEDIA) return createR2ObjectStore(env.MEDIA);
  return stubObjectStore;
};
