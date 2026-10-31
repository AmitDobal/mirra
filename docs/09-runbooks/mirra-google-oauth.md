# Mirra — Google OAuth (Better Auth)

## Goal

Production sign-in is **Google only**. Simulator / day-test uses **Continue as Dev Tester** (`x-mirra-user-id` when `ALLOW_DEV_USER_HEADER=true`).

## Prerequisites

- Google Cloud project with OAuth consent screen (External / Testing is fine)
- OAuth **Web** client (Better Auth uses this for id-token verification)
- Optional iOS client id for `expo-auth-session` on device

## Redirect / origins

Add to the Web client:

| Type | Value |
| --- | --- |
| Authorized JS origin | `http://127.0.0.1:8787` (local API) |
| Authorized redirect URI | `http://127.0.0.1:8787/api/auth/callback/google` |
| Authorized redirect URI | `https://<mirra-api-host>/api/auth/callback/google` (Workers) |
| App scheme | `mirra://` (Expo deep link; listed in Better Auth `trustedOrigins`) |

## API secrets (`.dev.vars` / `wrangler secret put`)

```bash
cd apps/api
# .dev.vars (local)
# APP_URL=http://127.0.0.1:8787
# BETTER_AUTH_SECRET=<long-random>
# GOOGLE_CLIENT_ID=<web-client-id>
# GOOGLE_CLIENT_SECRET=<web-client-secret>
# ALLOW_DEV_USER_HEADER=true   # local/day-test only — false for real prod
```

## Mobile env (`apps/mobile/.env`)

```bash
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8787
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<same-web-client-id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<ios-client-id-optional>
EXPO_PUBLIC_ALLOW_DEV_AUTH=true   # sim / preview only
```

Restart Expo after changing env.

## Verify

1. API: `GET /api/auth/ok` → non-5xx
2. With secrets set: Continue with Google → Metro `auth.google.session_ok` → `/v1/me` uses Bearer (no `x-mirra-user-id`)
3. Without secrets: social sign-in returns `PROVIDER_NOT_FOUND` (fail closed)
4. Sim without Google: **Continue as Dev Tester**
5. Smoke: `node apps/mobile/scripts/smoke-api.mjs` (includes Bearer mint via `/v1/dev/session`)

## Prod cutover

1. Set `ALLOW_DEV_USER_HEADER` off / remove from Worker vars
2. Put Google + `BETTER_AUTH_SECRET` + `APP_URL` as Worker secrets
3. Ship mobile build **without** `EXPO_PUBLIC_ALLOW_DEV_AUTH`
