import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";

import { createDb, schema } from "../db";
import type { MirraEnv } from "../env";

/**
 * Better Auth instance (per-request — D1 binding is request-scoped).
 * Google is enabled only when GOOGLE_CLIENT_ID + SECRET are set.
 * Expo plugin copies `expo-origin` onto Origin for native cookie flows.
 * Bearer plugin exposes `set-auth-token` for React Native Authorization headers.
 */
export const createAuth = (env: MirraEnv) => {
  const db = createDb(env.DB);
  const baseURL = (env.APP_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "");
  const https = baseURL.startsWith("https://");
  const secret =
    env.BETTER_AUTH_SECRET?.trim() ||
    // Local-only fallback so `/api/auth/*` mounts without secrets; never ship this in prod.
    "mirra-dev-better-auth-secret-change-me";

  const googleId = env.GOOGLE_CLIENT_ID?.trim();
  const googleSecret = env.GOOGLE_CLIENT_SECRET?.trim();

  return betterAuth({
    appName: env.APP_NAME || "Mirra",
    baseURL,
    secret,
    trustedOrigins: [
      baseURL,
      "mirra://",
      "mirra://*",
      "http://127.0.0.1:8787",
      "http://localhost:8787",
      "exp://",
      "exp://*",
    ],
    database: drizzleAdapter(db, {
      provider: "sqlite",
      usePlural: true,
      schema,
    }),
    socialProviders:
      googleId && googleSecret
        ? {
            google: {
              clientId: googleId,
              clientSecret: googleSecret,
              prompt: "select_account",
            },
          }
        : {},
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: { enabled: false },
    advanced: {
      useSecureCookies: https,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: https,
      },
    },
    plugins: [expo(), bearer()],
  });
};

export type MirraAuth = ReturnType<typeof createAuth>;
