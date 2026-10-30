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

  revenueCatApiKey,
  /** Explicit flag + non-empty key required to leave the stub adapter. */
  revenueCatEnabled: revenueCatFlag && revenueCatApiKey.length > 0,
  appScheme: "mirra",
  appName: "Mirra",
} as const;
