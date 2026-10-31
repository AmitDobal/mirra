/** Opaque local ids (nanoid-style, no extra dep). */
export const newId = (prefix = "m"): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

/** Pre-session default; legacy rows were written under this id. */
export const LOCAL_USER_ID = "local";

let currentLocalUserId: string = LOCAL_USER_ID;

/** Sync read of the SQLite owner id (set at boot from the auth session). */
export const getLocalUserId = (): string => currentLocalUserId;

export const setLocalUserId = (userId: string): void => {
  currentLocalUserId = userId;
};

export const nowMs = (): number => Date.now();
