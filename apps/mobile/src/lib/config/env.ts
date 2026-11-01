import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

const fromExtra = (key: string): string | null => {
  const value = (extra as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : null;
};

/**
 * Prefer static `process.env.EXPO_PUBLIC_*` so Metro inlines at export time.
 * Dynamic `process.env[key]` is NOT replaced and stays empty in EAS Update bundles.
 */
const pick = (inlined: string | undefined, extraKey: string, fallback = ""): string =>
  (inlined && inlined.length > 0 ? inlined : null) ??
  fromExtra(extraKey) ??
  fallback;

const revenueCatApiKey = pick(
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
  "revenueCatApiKey",
);

const revenueCatFlag =
  (process.env.EXPO_PUBLIC_REVENUECAT_ENABLED ??
    fromExtra("revenueCatEnabled") ??
    "") === "true";

/** Runtime config — never hardcode URLs in feature code. */
export const env = {
  apiBaseUrl: pick(
    process.env.EXPO_PUBLIC_API_BASE_URL,
    "apiBaseUrl",
    "http://127.0.0.1:8787",
  ).replace(/\/$/, ""),
  /** Dev identity header until Better Auth lands (`x-mirra-user-id`). */
  mirraUserId: pick(
    process.env.EXPO_PUBLIC_MIRRA_USER_ID,
    "mirraUserId",
    "dev-user-1",
  ),

  /** Show "Continue as Dev Tester" outside `__DEV__` (e.g. preview builds). */
  allowDevAuth:
    (process.env.EXPO_PUBLIC_ALLOW_DEV_AUTH ??
      fromExtra("allowDevAuth") ??
      "") === "true",
  /**
   * Optional leftover client ids. Google sign-in uses Better Auth API social
   * (Worker GOOGLE_CLIENT_*); mobile ids are not required for Expo Go.
   */
  googleWebClientId: pick(
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    "googleWebClientId",
  ),
  googleIosClientId: pick(
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    "googleIosClientId",
  ),
  googleAndroidClientId: pick(
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    "googleAndroidClientId",
  ),

  revenueCatApiKey,
  /** Explicit flag + non-empty key required to leave the stub adapter. */
  revenueCatEnabled: revenueCatFlag && revenueCatApiKey.length > 0,
  appScheme: "mirra",
  appName: "Mirra",
} as const;
