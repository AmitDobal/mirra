import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";

import { GoogleGlyph } from "@/features/onboarding/components/AuthGlyphs";
import { authClient } from "@/lib/auth/auth-client";
import { getBearerToken } from "@/lib/auth/session";
import { errorMessage, logger } from "@/lib/logger";
import { Button } from "@/ui";

WebBrowser.maybeCompleteAuthSession();

type Props = {
  readonly label: string;
  /** Called after Better Auth social returns a session user id. */
  readonly onSignedIn: (userId: string, bearer?: string | null) => void;
  readonly onError?: (message: string) => void;
};

/**
 * Google via Better Auth browser social (HitDM pattern).
 * Opens API → accounts.google.com → `/api/auth/callback/google` → deep link.
 * Never uses expo-auth-session / auth.expo.io proxy.
 */
export const GoogleSignInButton = ({ label, onSignedIn, onError }: Props) => {
  const [pending, setPending] = useState(false);

  const handlePress = () => {
    void (async () => {
      if (pending) return;
      setPending(true);
      try {
        const callbackURL = Linking.createURL("/");
        const result = await authClient.signIn.social({
          provider: "google",
          callbackURL,
          errorCallbackURL: callbackURL,
          newUserCallbackURL: callbackURL,
        });

        if (result.error) {
          const message = result.error.message ?? "Could not sign in with Google";
          logger.error("auth.google.better_auth_failed", { message });
          onError?.(message);
          return;
        }

        const data = result.data;
        const userIdFromBody =
          data && "user" in data && data.user?.id ? data.user.id : null;
        const tokenFromBody =
          data && "token" in data && typeof data.token === "string"
            ? data.token
            : null;

        if (userIdFromBody) {
          onSignedIn(userIdFromBody, tokenFromBody ?? getBearerToken());
          return;
        }

        const session = await authClient.getSession();
        const sessionUserId = session.data?.user?.id;
        if (!sessionUserId) {
          logger.error("auth.google.no_session");
          onError?.("Google sign-in did not return a session");
          return;
        }
        onSignedIn(sessionUserId, getBearerToken());
      } catch (err) {
        const message = errorMessage(err);
        logger.error("auth.google.exception", { message });
        onError?.(message);
      } finally {
        setPending(false);
      }
    })();
  };

  return (
    <Button
      label={label}
      variant="surfaceLow"
      size="tall"
      icon={<GoogleGlyph />}
      disabled={pending}
      onPress={handlePress}
    />
  );
};
