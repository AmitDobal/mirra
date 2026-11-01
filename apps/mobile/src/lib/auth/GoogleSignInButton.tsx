import { getSetCookie } from "@better-auth/expo/client";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";

import { GoogleGlyph } from "@/features/onboarding/components/AuthGlyphs";
import { authClient } from "@/lib/auth/auth-client";
import {
  clearGoogleAuthHandoff,
  markGoogleAuthHandoff,
} from "@/lib/auth/funnel-nav";
import { getBearerToken } from "@/lib/auth/session";
import { env } from "@/lib/config/env";
import { errorMessage, logger } from "@/lib/logger";
import { Button } from "@/ui";

WebBrowser.maybeCompleteAuthSession();

/** Matches `@better-auth/expo` `storagePrefix` + `_cookie` (see auth-client). */
const EXPO_COOKIE_KEY = `${env.appScheme}_cookie`;

type Props = {
  readonly label: string;
  /** Called after Better Auth social returns a session user id. */
  readonly onSignedIn: (userId: string, bearer?: string | null) => void;
  readonly onError?: (message: string) => void;
};

const isMissingWebBrowserError = (message: string): boolean =>
  /expo-web-browser/i.test(message) &&
  (/not installed/i.test(message) || /cannot find module/i.test(message));

const friendlyGoogleError = (raw: string): string => {
  if (isMissingWebBrowserError(raw)) {
    return "Could not open Google sign-in. Please try again.";
  }
  if (/network|fetch failed|failed to fetch/i.test(raw)) {
    return "Network error during Google sign-in. Check your connection and try again.";
  }
  return raw || "Could not sign in with Google";
};

const authorizeUrlFromData = (data: unknown): string | null => {
  if (!data || typeof data !== "object") return null;
  if (!("url" in data)) return null;
  const url = (data as { url?: unknown }).url;
  return typeof url === "string" && url.length > 0 ? url : null;
};

/** Persist session cookie that Better Auth Expo appends on the deep-link return. */
const persistCookieFromRedirect = async (redirectUrl: string): Promise<boolean> => {
  let cookie: string | null = null;
  try {
    cookie = new URL(redirectUrl).searchParams.get("cookie");
  } catch {
    return false;
  }
  if (!cookie) return false;
  const current = await SecureStore.getItemAsync(EXPO_COOKIE_KEY);
  await SecureStore.setItemAsync(
    EXPO_COOKIE_KEY,
    getSetCookie(cookie, current ?? undefined),
  );
  return true;
};

/**
 * Google via Better Auth social + static `expo-web-browser`.
 *
 * `@better-auth/expo` dynamically `import`s `expo-web-browser` and throws
 * "not installed" in Expo Go / EAS Update even when the package is present.
 * We request the authorize URL with `disableRedirect: true` (so that import
 * never runs), then open the Expo proxy with our static import.
 */
export const GoogleSignInButton = ({ label, onSignedIn, onError }: Props) => {
  const [pending, setPending] = useState(false);

  const handlePress = () => {
    void (async () => {
      if (pending) return;
      setPending(true);
      /** Keep OAuth return on auth — not `/` cold-start (double paywall / wrong gate). */
      const callbackURL = Linking.createURL("/(onboarding)/auth");
      markGoogleAuthHandoff();
      try {
        const result = await authClient.signIn.social({
          provider: "google",
          callbackURL,
          errorCallbackURL: callbackURL,
          newUserCallbackURL: callbackURL,
          disableRedirect: true,
        });

        if (result.error) {
          const message = friendlyGoogleError(
            result.error.message ?? "Could not sign in with Google",
          );
          logger.error("auth.google.better_auth_failed", { message });
          clearGoogleAuthHandoff();
          onError?.(message);
          return;
        }

        const authorizeUrl = authorizeUrlFromData(result.data);
        if (!authorizeUrl) {
          logger.error("auth.google.no_authorize_url");
          clearGoogleAuthHandoff();
          onError?.("Could not start Google sign-in");
          return;
        }

        const proxyURL = `${env.apiBaseUrl}/api/auth/expo-authorization-proxy?${new URLSearchParams(
          { authorizationURL: authorizeUrl },
        ).toString()}`;

        let browserResult: WebBrowser.WebBrowserAuthSessionResult;
        try {
          browserResult = await WebBrowser.openAuthSessionAsync(
            proxyURL,
            callbackURL,
          );
        } catch (err) {
          const raw = errorMessage(err);
          logger.error("auth.google.browser_open_failed", { message: raw });
          clearGoogleAuthHandoff();
          onError?.(friendlyGoogleError(raw));
          return;
        }

        if (browserResult.type === "cancel" || browserResult.type === "dismiss") {
          clearGoogleAuthHandoff();
          onError?.("Sign-in cancelled");
          return;
        }
        if (
          browserResult.type !== "success" ||
          !("url" in browserResult) ||
          !browserResult.url
        ) {
          clearGoogleAuthHandoff();
          onError?.("Google sign-in did not complete");
          return;
        }

        await persistCookieFromRedirect(browserResult.url);

        const session = await authClient.getSession();
        const sessionUserId = session.data?.user?.id;
        if (!sessionUserId) {
          logger.error("auth.google.no_session");
          clearGoogleAuthHandoff();
          onError?.("Google sign-in did not return a session");
          return;
        }
        onSignedIn(sessionUserId, getBearerToken());
      } catch (err) {
        const message = friendlyGoogleError(errorMessage(err));
        logger.error("auth.google.exception", { message });
        clearGoogleAuthHandoff();
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
