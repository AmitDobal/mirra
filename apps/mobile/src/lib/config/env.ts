import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

const fromExtra = (key: string): string | null => {
  const value = (extra as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : null;
};

const read = (envKey: string, extraKey: string, fallback: string): string =>
  (
    process.env[envKey] ??
    fromExtra(extraKey) ??
    fallback
  ).replace(/\/$/, "");

const readOptional = (envKey: string, extraKey: string): string =>
  process.env[envKey] ?? fromExtra(extraKey) ?? "";

const revenueCatApiKey = readOptional(
  "EXPO_PUBLIC_REVENUECAT_API_KEY",
  "revenueCatApiKey",
);

const revenueCatFlag =
  (process.env.EXPO_PUBLIC_REVENUECAT_ENABLED ??
    fromExtra("revenueCatEnabled") ??
    "") === "true";

/** Runtime config — never hardcode URLs in feature code. */
export const env = {
  apiBaseUrl: read(
    "EXPO_PUBLIC_API_BASE_URL",
    "apiBaseUrl",
    "http://127.0.0.1:8787",
  ),
  /** Dev identity header until Better Auth lands (`x-mirra-user-id`). */
  mirraUserId: read(
    "EXPO_PUBLIC_MIRRA_USER_ID",
    "mirraUserId",
    "dev-user-1",
  ),

  /** Show "Continue as Dev Tester" outside `__DEV__` (e.g. preview builds). */
  allowDevAuth:
    (process.env.EXPO_PUBLIC_ALLOW_DEV_AUTH ??
      fromExtra("allowDevAuth") ??
      "") === "true",
  /** Google OAuth web client id (Better Auth / Google sign-in). Empty = disabled. */
  googleWebClientId: readOptional(
    "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
    "googleWebClientId",
  ),
  googleIosClientId: readOptional(
    "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID",
    "googleIosClientId",
  ),
  googleAndroidClientId: readOptional(
    "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID",
    "googleAndroidClientId",
  ),

  revenueCatApiKey,
  /** Explicit flag + non-empty key required to leave the stub adapter. */
  revenueCatEnabled: revenueCatFlag && revenueCatApiKey.length > 0,
  appScheme: "mirra",
  appName: "Mirra",
} as const;
