import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Inject EXPO_PUBLIC_* into `extra` so EAS Update / Expo Go can read Google
 * client ids even if a dynamic env lookup slips through. Values come from shell
 * or `--environment preview` EAS env — never commit secrets in app.json.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
  const googleAndroidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";
  const allowDevAuth = process.env.EXPO_PUBLIC_ALLOW_DEV_AUTH ?? "";
  const apiBaseUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    (config.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ??
    "http://127.0.0.1:8787";
  const mirraUserId =
    process.env.EXPO_PUBLIC_MIRRA_USER_ID ??
    (config.extra as { mirraUserId?: string } | undefined)?.mirraUserId ??
    "dev-user-1";

  return {
    ...config,
    name: config.name ?? "Mirra",
    slug: config.slug ?? "mirra",
    extra: {
      ...config.extra,
      apiBaseUrl,
      mirraUserId,
      allowDevAuth,
      googleWebClientId,
      googleIosClientId,
      googleAndroidClientId,
    },
  };
};
