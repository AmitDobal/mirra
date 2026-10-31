import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

import { env } from "@/lib/config/env";
import { getBearerToken, setBearerToken } from "@/lib/auth/session";

/** Better Auth client — Google social + Expo SecureStore cookie bridge + Bearer. */
export const authClient = createAuthClient({
  baseURL: env.apiBaseUrl,
  plugins: [
    expoClient({
      scheme: env.appScheme,
      storagePrefix: env.appScheme,
      storage: SecureStore,
    }),
  ],
  fetchOptions: {
    auth: {
      type: "Bearer",
      token: () => getBearerToken() ?? "",
    },
    onSuccess: (ctx) => {
      const authToken = ctx.response.headers.get("set-auth-token");
      if (authToken) {
        void setBearerToken(authToken);
      }
    },
  },
});
