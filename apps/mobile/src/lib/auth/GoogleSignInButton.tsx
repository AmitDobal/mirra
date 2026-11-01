import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";

import { GoogleGlyph } from "@/features/onboarding/components/AuthGlyphs";
import { env } from "@/lib/config/env";
import { errorMessage, logger } from "@/lib/logger";
import { Button } from "@/ui";

WebBrowser.maybeCompleteAuthSession();

type Props = {
  readonly label: string;
  /** Called with the Google ID token after the OAuth round trip. */
  readonly onIdToken: (idToken: string) => void;
};

/**
 * Google ID token via expo-auth-session. Only mount when
 * `env.googleWebClientId` is set (the provider hook throws without client ids).
 *
 * Do not force `mirra://` as redirectUri: Web clients reject custom schemes
 * (invalid_request). With an iOS client id, the Google provider uses the
 * native redirect (`host.exp.Exponent:/oauthredirect` in Expo Go,
 * `ai.mirra.app:/oauthredirect` in a standalone build).
 */
export const GoogleSignInButton = ({ label, onIdToken }: Props) => {
  const webClientId = env.googleWebClientId;
  const iosClientId = env.googleIosClientId;
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId,
    // Never fall back to the Web client id on iOS — that pairs a web client
    // with a native redirect and Google returns invalid_request.
    ...(iosClientId ? { iosClientId } : {}),
    ...(env.googleAndroidClientId
      ? { androidClientId: env.googleAndroidClientId }
      : {}),
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === "success") {
      const idToken = response.params.id_token;
      if (idToken) onIdToken(idToken);
      return;
    }
    if (response.type === "error") {
      logger.error("auth.google.error", { message: errorMessage(response.error) });
    }
  }, [response, onIdToken]);

  const handlePress = () => {
    void promptAsync();
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
