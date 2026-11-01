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

## Clients (exactly 2 — do not create more)

| Name | Type | Used by |
| --- | --- | --- |
| **Mirra API** | Web application | Worker `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, mobile `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, Better Auth |
| **Mirra Expo Go iOS** | iOS · bundle `host.exp.Exponent` | mobile `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (Expo Go / day-test) |

Day-test uses **Expo Go**, so the single iOS client must be `host.exp.Exponent` (not `ai.mirra.app`). For a future standalone build, replace that one iOS client — still keep **exactly two** clients total (1 Web + 1 iOS).

Deleted 2026-11-01: duplicate **Mirra Expo Go iOS**, **Mirra iOS**. HitDM-project Mirra clients stay abandoned.

### Web client — Authorized JS origins

- `http://127.0.0.1:8787`
- `https://mirra-api.amit-dobalwork.workers.dev`
- `https://auth.expo.io`

### Web client — Authorized redirect URIs

- `http://127.0.0.1:8787/api/auth/callback/google`
- `https://mirra-api.amit-dobalwork.workers.dev/api/auth/callback/google`
- `https://auth.expo.io/@amitdobal141/mirra`
- `https://auth.expo.io/@amitdobal141/mirra/--/expo-auth-session`

Custom schemes (`mirra://`, `exp://`) are **not** valid on Web clients. Mobile must use an **iOS** client id so `expo-auth-session` uses the native redirect (`host.exp.Exponent:/oauthredirect` in Expo Go). Do not force `makeRedirectUri({ scheme: "mirra" })` with only a Web client id (causes `invalid_request`).

## Secrets (never commit)

Worker `mirra-api` (`wrangler secret put` from `apps/api`):

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` = **Mirra** Web client (project `auth-test-442714`)
- `BETTER_AUTH_SECRET`
- `APP_URL` = `https://mirra-api.amit-dobalwork.workers.dev`

Local: same in gitignored `apps/api/.dev.vars`.  
Mobile gitignored `.env`:

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` = Mirra Web client id
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` = **Mirra Expo Go iOS** client id only (bundle `host.exp.Exponent`)
- `EXPO_PUBLIC_ALLOW_DEV_AUTH=true` for day-test only

## Code path

1. API Better Auth at `/api/auth/*` + `GET /api/auth/ok`
2. Mobile `GoogleSignInButton` → id_token via `useIdTokenAuthRequest` (web + ios client ids; no forced `mirra://` redirect) → Better Auth social → Bearer

## Prove

```bash
curl -sS https://mirra-api.amit-dobalwork.workers.dev/api/auth/ok
# expect {"ok":true,"google":true}
```

Consent branding: open Google authorize URL with the **Mirra** Web client id → app name **Mirra**, not HitDM. Screenshots: `/tmp/mirra-qa/google-oauth-mirra-project/`.

## EAS day-test

Republish `day-test` with `EXPO_PUBLIC_GOOGLE_*` from local `.env` **and** EAS env
`preview` (`eas env:set`). `env.ts` must use static `process.env.EXPO_PUBLIC_GOOGLE_*`
(Metro does not inline `process.env[key]`). `app.config.ts` also copies them into
`extra`. After publish, confirm the Hermes `.hbc` contains `apps.googleusercontent.com`
(length/hit-count only — never log full client ids). Missing string ⇒ alert
**Google sign-in not configured**. See `ios-day-test.md`.

## Follow-ups (P1)

- Create true project id `mirra-app` after quota increase; migrate clients + secrets
- Upload Mirra logo on Branding (optional; Testing skips verification)
- Cutover: turn off `ALLOW_DEV_USER_HEADER` only for real prod auth
