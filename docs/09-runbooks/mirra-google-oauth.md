# Mirra — Google OAuth (Better Auth)

Date: 2026-11-01  
Account: `amit.dobalwork@gmail.com`  
GCP project: **Mirra** (`auth-test-442714`) — dedicated (not HitDM)  
API: `https://mirra-api.amit-dobalwork.workers.dev`

## Why not HitDM

Earlier Mirra OAuth clients were created under GCP project **HitDM** (`hitdm-app`). Consent UI showed **HitDM**, and Expo redirects were missing → Google `invalid_request` / Error 400. Those HitDM **Mirra API** / Mirra iOS clients are **abandoned for Mirra**. Do not point Worker or mobile env at HitDM clients.

Free-trial project quota blocked creating a fresh id like `mirra-app`. Unused project **Auth-test** was renamed to **Mirra** (id remains `auth-test-442714`). When quota allows, optionally create `mirra-app` and migrate clients.

## Consent / Audience

| Field | Value |
| --- | --- |
| App name | Mirra |
| User type | External |
| Publishing | Testing |
| Test users | `amit.dobalwork@gmail.com`, `amit.dobalwork1@gmail.com` |

## Clients

| Name | Type | Used by |
| --- | --- | --- |
| **Mirra API** | Web application | Worker `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, mobile `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, Better Auth, **Expo Go day-test** |
| **Mirra iOS** (optional) | iOS · bundle `ai.mirra.app` | Standalone / dev-client only — **not** for Expo Go |

### Expo Go = Web + auth.expo.io only

Day-test runs in **Expo Go**. Do **not** authorize with an iOS client whose bundle is `host.exp.Exponent` — Google often returns **Error 400 `invalid_request`** (Access blocked) for that insecure / wrong-app pairing. Weird third-party branding (e.g. kalshi) can also appear when a stale/bad native client is used.

`GoogleSignInButton` detects Expo Go and:

1. Uses the **Web** client id only
2. Sets `redirectUri` to `https://auth.expo.io/@amitdobal141/mirra`
3. Opens the AuthSession **proxy** start URL, then returns via `getDefaultReturnUrl()`

Leave any Expo Go iOS client unused (or delete it in GCP). Create a real iOS client for `ai.mirra.app` only when shipping a standalone build.

### Web client — Authorized JS origins

- `http://127.0.0.1:8787`
- `https://mirra-api.amit-dobalwork.workers.dev`
- `https://auth.expo.io`

### Web client — Authorized redirect URIs

- `http://127.0.0.1:8787/api/auth/callback/google`
- `https://mirra-api.amit-dobalwork.workers.dev/api/auth/callback/google`
- `https://auth.expo.io/@amitdobal141/mirra`
- `https://auth.expo.io/@amitdobal141/mirra/--/expo-auth-session`

Custom schemes (`mirra://`, `exp://`, `host.exp.Exponent:/…`) are **not** valid on Web clients.

## Secrets (never commit)

Worker `mirra-api` (`wrangler secret put` from `apps/api`):

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` = **Mirra** Web client (project `auth-test-442714`)
- `BETTER_AUTH_SECRET`
- `APP_URL` = `https://mirra-api.amit-dobalwork.workers.dev`

Local: same in gitignored `apps/api/.dev.vars`.  
Mobile gitignored `.env` / EAS `preview`:

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` = Mirra Web client id (**required** for day-test)
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` = empty for Expo Go; set only for standalone `ai.mirra.app`
- `EXPO_PUBLIC_ALLOW_DEV_AUTH=true` for day-test only

## Code path

1. API Better Auth at `/api/auth/*` + `GET /api/auth/ok`
2. Mobile `GoogleSignInButton` → Expo Go proxy id_token **or** native client code/id_token → Better Auth social → Bearer

## Prove

```bash
curl -sS https://mirra-api.amit-dobalwork.workers.dev/api/auth/ok
# expect {"ok":true,"google":true}
```

Consent branding: open Google authorize URL with the **Mirra** Web client id → app name **Mirra**, not HitDM/kalshi. Screenshots: `/tmp/mirra-qa/google-oauth-proxy-fix/`.

## EAS day-test

Republish `day-test` with `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` from local `.env` **and** EAS env `preview`. Leave IOS empty for Expo Go. `env.ts` must use static `process.env.EXPO_PUBLIC_GOOGLE_*`. After publish, confirm Hermes `.hbc` contains `apps.googleusercontent.com` (length/hit-count only).

## Follow-ups (P1)

- Create true project id `mirra-app` after quota increase; migrate clients + secrets
- Standalone: add iOS client for `ai.mirra.app` (not Expo Go)
- Upload Mirra logo on Branding (optional; Testing skips verification)
- Cutover: turn off `ALLOW_DEV_USER_HEADER` only for real prod auth
