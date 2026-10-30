/** Opaque local ids (nanoid-style, no extra dep). */
export const newId = (prefix = "m"): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const LOCAL_USER_ID = "local";

export const nowMs = (): number => Date.now();
