import {
  getDefaultReturnUrl,
  getRedirectUrl,
  ResponseType,
} from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";

import { GoogleGlyph } from "@/features/onboarding/components/AuthGlyphs";
import { env } from "@/lib/config/env";
import { errorMessage, logger } from "@/lib/logger";
import { Button } from "@/ui";

WebBrowser.maybeCompleteAuthSession();

const EXPO_PROXY_PROJECT = "@amitdobal141/mirra";

type Props = {
  readonly label: string;
  /** Called with the Google ID token after the OAuth round trip. */
  readonly onIdToken: (idToken: string) => void;
};

const isExpoGoRuntime = (): boolean =>
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const proxyRedirectUri = (): string => {
  try {
    return getRedirectUrl();
  } catch {
    return `https://auth.expo.io/${EXPO_PROXY_PROJECT}`;
  }
};

/**
 * Google ID token via expo-auth-session.
 *
 * Expo Go: Web client + auth.expo.io proxy only (never host.exp.Exponent iOS
 * client — Google often returns invalid_request for that bundle).
 * Standalone / dev client: native iOS/Android client ids when set.
 */
export const GoogleSignInButton = ({ label, onIdToken }: Props) => {
  const webClientId = env.googleWebClientId;
  const expoGo = isExpoGoRuntime();
  const proxyUri = expoGo ? proxyRedirectUri() : undefined;

  const [request, response, promptAsync] = Google.useAuthRequest({
    // Fallback so iOS Expo Go can use the Web client (provider prefers
    // iosClientId; we omit that on Expo Go on purpose).
    clientId: webClientId,
    webClientId,
    ...(expoGo
      ? {
          redirectUri: proxyUri,
          responseType: ResponseType.IdToken,
          usePKCE: false,
        }
      : {
          ...(env.googleIosClientId
            ? { iosClientId: env.googleIosClientId }
            : {}),
          ...(env.googleAndroidClientId
            ? { androidClientId: env.googleAndroidClientId }
            : {}),
        }),
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === "success") {
      const idToken = response.params.id_token;
      if (idToken) onIdToken(idToken);
      return;
    }
    if (response.type === "error") {
      logger.error("auth.google.error", {
        message: errorMessage(response.error),
      });
    }
  }, [response, onIdToken]);

  const handlePress = () => {
    void (async () => {
      if (!request) return;

      if (expoGo && proxyUri) {
        try {
          const returnUrl = getDefaultReturnUrl();
          const authUrl =
            request.url ?? (await request.makeAuthUrlAsync(Google.discovery));
          const startUrl = `${proxyUri}/start?${new URLSearchParams({
            authUrl,
            returnUrl,
          }).toString()}`;
          const browserResult = await WebBrowser.openAuthSessionAsync(
            startUrl,
            returnUrl,
          );
          if (browserResult.type !== "success" || !("url" in browserResult)) {
            return;
          }
          const parsed = request.parseReturnUrl(browserResult.url);
          if (parsed.type === "success" && parsed.params.id_token) {
            onIdToken(parsed.params.id_token);
            return;
          }
          if (parsed.type === "error") {
            logger.error("auth.google.proxy_error", {
              message: errorMessage(parsed.error),
            });
          }
        } catch (error) {
          logger.error("auth.google.proxy_prompt", {
            message: errorMessage(error),
          });
        }
        return;
      }

      await promptAsync();
    })();
  };

  return (
    <Button
      label={label}
      variant="surfaceLow"
      size="tall"
      icon={<GoogleGlyph />}
      disabled={!request}
      onPress={handlePress}
    />
  );
};
