# Mirra — Google OAuth (Better Auth)

Date: 2026-11-01  
Account: `amit.dobalwork@gmail.com`  
GCP project: **HitDM** (`hitdm-app`) — Web OAuth client reused / extended for Mirra  
API: `https://mirra-api.amit-dobalwork.workers.dev`

## Goal

Production sign-in is **Google only**. Simulator / day-test keeps **Continue as Dev Tester** (`x-mirra-user-id` / `POST /v1/dev/session` while `ALLOW_DEV_USER_HEADER=true`).

## Redirect / origins (Web client)

| Type | Value |
| --- | --- |
| Authorized JS origin | `http://127.0.0.1:8787` |
| Authorized JS origin | `https://mirra-api.amit-dobalwork.workers.dev` |
| Authorized redirect URI | `http://127.0.0.1:8787/api/auth/callback/google` |
| Authorized redirect URI | `https://mirra-api.amit-dobalwork.workers.dev/api/auth/callback/google` |
| App scheme | `mirra://` (Better Auth `trustedOrigins`) |
| Consent | External; Audience currently **In production** on `hitdm-app` (test-user list N/A). Client: **Mirra API**. |

## Secrets (never commit)

Worker `mirra-api` (via `wrangler secret put` from `apps/api`):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `BETTER_AUTH_SECRET`
- `APP_URL` = `https://mirra-api.amit-dobalwork.workers.dev`

Local: same keys in gitignored `apps/api/.dev.vars` (local `APP_URL=http://127.0.0.1:8787`).  
Mobile: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` = same web client id; `EXPO_PUBLIC_ALLOW_DEV_AUTH=true` for day-test.

## Code path

1. API mounts Better Auth at `/api/auth/*` (`apps/api/src/routes/auth.ts`) plus probe `GET /api/auth/ok`.
2. Mobile `GoogleSignInButton` → Google id_token → `authClient.signIn.social({ provider: "google", idToken })` → `setGoogleSession` + Bearer from `set-auth-token`.
3. `/v1/me` prefers `Authorization: Bearer`; Dev Tester still uses `x-mirra-user-id` when not on a Google session.

## Playwright prove recipe

HitDM `e2e/.auth/user.json` is a **HitDM app session** (`.hitdm.com` cookies), not a raw Gmail profile. Prefer headed Chrome already logged in as `amit.dobalwork@gmail.com` for GCP Console edits. Do **not** run HitDM auth setup that overwrites `user.json` empty.

```bash
mkdir -p /tmp/mirra-qa/google-oauth
# optional: echo '<web-client-id>' > /tmp/mirra-qa/google-oauth/client-id.txt
cd apps/api
MIRRA_API_BASE=https://mirra-api.amit-dobalwork.workers.dev \
  node scripts/prove-google-oauth.mjs
```

Expect:

- `GET /api/auth/ok` → 200 `{ ok: true, google: true }`
- Bogus `POST /api/auth/sign-in/social` → 4xx
- `POST /v1/dev/session` + Bearer `GET /v1/me` → 200
- Screenshots under `/tmp/mirra-qa/google-oauth/prove-*.png`

GCP Console (manual or headed Playwright with a Google-logged Chrome profile):

1. Open Auth Platform / Credentials for project `hitdm-app`
2. Edit the Mirra/HitDM **Web** client; ensure Workers origin + redirect above
3. Audience → Testing → test user `amit.dobalwork@gmail.com`

## Follow-ups

- EAS day-test: set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` on the mobile env if not already in the build
- Cutover: turn off `ALLOW_DEV_USER_HEADER` only when ready for real prod auth

## Playwright session note

`hitdm/e2e/.auth/user.json` has **only** `.hitdm.com` cookies — not Google Console. GCP edits used the **mvp-sprint Playwright MCP** browser already signed in as `amit.dobalwork@gmail.com`. Do not wipe HitDM `user.json`.
