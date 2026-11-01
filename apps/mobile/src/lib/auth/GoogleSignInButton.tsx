import { makeRedirectUri } from "expo-auth-session";
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
 * Caller exchanges the token with Better Auth (`authClient.signIn.social`)
 * and persists via `setGoogleSession`.
 */
export const GoogleSignInButton = ({ label, onIdToken }: Props) => {
  const webClientId = env.googleWebClientId;
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId,
    iosClientId: env.googleIosClientId || webClientId,
    androidClientId: env.googleAndroidClientId || webClientId,
    redirectUri: makeRedirectUri({ scheme: env.appScheme }),
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
