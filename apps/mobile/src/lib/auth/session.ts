import * as SecureStore from "expo-secure-store";

import { getLocalUserId, reassignLocalUser, setLocalUserId } from "@/db";
import { env } from "@/lib/config/env";
import { errorMessage, logger } from "@/lib/logger";

export type AuthMode = "dev" | "google";

const USER_ID_KEY = "mirra.userId";
const AUTH_MODE_KEY = "mirra.authMode";
const BEARER_TOKEN_KEY = "mirra.bearerToken";
const FALLBACK_USER_ID = "day-test-1";

let cachedUserId: string | null = null;
let cachedMode: AuthMode | null = null;
let cachedBearerToken: string | null = null;

const isAuthMode = (value: string | null): value is AuthMode =>
  value === "dev" || value === "google";

const readItem = async (key: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    logger.warn("auth.secure_store.read_failed", { key, message: errorMessage(err) });
    return null;
  }
};

const writeItem = async (key: string, value: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (err) {
    logger.warn("auth.secure_store.write_failed", { key, message: errorMessage(err) });
  }
};

const deleteItem = async (key: string): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    logger.warn("auth.secure_store.delete_failed", { key, message: errorMessage(err) });
  }
};

/** Sync identity for API + SQLite: session → env → `day-test-1`. */
export const getAuthUserId = (): string =>
  cachedUserId ?? (env.mirraUserId || FALLBACK_USER_ID);

export const getAuthMode = (): AuthMode | null => cachedMode;

/** Better Auth session token for `Authorization: Bearer …` (Google / minted). */
export const getBearerToken = (): string | null => cachedBearerToken;

export const hasSession = (): boolean => cachedUserId !== null;

/**
 * True only for a real Google / Better Auth identity.
 * Dev Tester (`setDevSession`) must NOT pass — blocks purchase/restore.
 */
export const requireSignedInUser = (): boolean =>
  cachedMode === "google" && cachedUserId !== null;

/**
 * Soft-skip paywall → free tabs (no Pro claim).
 * Google signed-in, or day-test Dev Tester when ALLOW_DEV_AUTH / __DEV__.
 */
export const canSoftSkipPaywall = (): boolean => {
  if (requireSignedInUser()) return true;
  if (!(__DEV__ || env.allowDevAuth)) return false;
  return cachedMode === "dev" && cachedUserId !== null;
};

/** Point SQLite at the active identity, moving rows from the previous owner. */
const syncLocalUser = async (nextUserId: string): Promise<void> => {
  const previous = getLocalUserId();
  setLocalUserId(nextUserId);
  try {
    await reassignLocalUser(previous, nextUserId);
    if (previous !== "local") await reassignLocalUser("local", nextUserId);
  } catch (err) {
    logger.warn("auth.local_reassign_failed", { message: errorMessage(err) });
  }
};

const setSession = async (
  userId: string,
  mode: AuthMode,
  bearerToken?: string | null,
): Promise<void> => {
  cachedUserId = userId;
  cachedMode = mode;
  const writes: Promise<void>[] = [
    writeItem(USER_ID_KEY, userId),
    writeItem(AUTH_MODE_KEY, mode),
  ];
  if (bearerToken) {
    cachedBearerToken = bearerToken;
    writes.push(writeItem(BEARER_TOKEN_KEY, bearerToken));
  } else if (mode === "dev") {
    cachedBearerToken = null;
    writes.push(deleteItem(BEARER_TOKEN_KEY));
  }
  await Promise.all(writes);
  await syncLocalUser(userId);
  logger.info("auth.session_set", { mode, hasBearer: Boolean(cachedBearerToken) });
};

/** Persist Better Auth bearer token from `set-auth-token` (Google sign-in). */
export const setBearerToken = async (token: string): Promise<void> => {
  cachedBearerToken = token;
  await writeItem(BEARER_TOKEN_KEY, token);
};

/** Load the stored session into memory. Call once at boot, after the DB opens. */
export const hydrateAuthSession = async (): Promise<void> => {
  const [userId, mode, bearer] = await Promise.all([
    readItem(USER_ID_KEY),
    readItem(AUTH_MODE_KEY),
    readItem(BEARER_TOKEN_KEY),
  ]);
  if (userId) {
    cachedUserId = userId;
    cachedMode = isAuthMode(mode) ? mode : "dev";
  }
  cachedBearerToken = bearer;
  await syncLocalUser(getAuthUserId());
};

/** Dev/sim identity (API accepts `x-mirra-user-id` when ALLOW_DEV_USER_HEADER=true). */
export const setDevSession = (userId: string = getAuthUserId()): Promise<void> =>
  setSession(userId, "dev", null);

/** Persist a verified Google identity (server-issued user id + optional bearer). */
export const setGoogleSession = (
  userId: string,
  bearerToken?: string | null,
): Promise<void> => setSession(userId, "google", bearerToken);

export const clearSession = async (): Promise<void> => {
  cachedUserId = null;
  cachedMode = null;
  cachedBearerToken = null;
  await Promise.all([
    deleteItem(USER_ID_KEY),
    deleteItem(AUTH_MODE_KEY),
    deleteItem(BEARER_TOKEN_KEY),
  ]);
  await syncLocalUser(getAuthUserId());
};
