# Mirra — Google OAuth (Better Auth social)

Date: 2026-11-01  
Account: `amit.dobalwork@gmail.com`  
GCP project: **Mirra** (`auth-test-442714`) — dedicated (not HitDM)  
API: `https://mirra-api.amit-dobalwork.workers.dev`

## Why not HitDM GCP clients

Earlier Mirra OAuth clients lived under GCP **HitDM**. Consent showed HitDM and Expo redirects were wrong. Those clients are abandoned for Mirra. Worker + mobile use the **Mirra** Web client only.

## Prod path (required) — Better Auth browser social

**Never use `expo-auth-session` / AuthSession proxy for Google.** That forces the **auth.expo.io** trust interstitial ("Do you fully trust…") in Expo Go.

Mirror HitDM:

1. Mobile calls `authClient.signIn.social({ provider: "google", callbackURL })` with `Linking.createURL("/")`
2. `@better-auth/expo` opens the browser to the API authorize URL
3. API redirects to **accounts.google.com** (Mirra Web client)
4. Google returns to `APP_URL/api/auth/callback/google`
5. Better Auth deep-links back into the app (`mirra://` or `exp://`) and stores the session

No `auth.expo.io`. Mobile Google client IDs are **not** required for this path (only API `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`).

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
| **Mirra API** | Web application | Worker `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` |
| **Mirra iOS** (optional) | iOS · `ai.mirra.app` | Future standalone only — **not** Expo Go day-test |

### Web client — Authorized JS origins

- `http://127.0.0.1:8787`
- `https://mirra-api.amit-dobalwork.workers.dev`

### Web client — Authorized redirect URIs

- `http://127.0.0.1:8787/api/auth/callback/google`
- `https://mirra-api.amit-dobalwork.workers.dev/api/auth/callback/google`

Do **not** add `https://auth.expo.io/...` for Mirra Google. Custom schemes are not valid on Web clients; the API callback handles the handoff.

## Secrets (never commit)

Worker `mirra-api`:

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` = Mirra Web client
- `BETTER_AUTH_SECRET`
- `APP_URL` = `https://mirra-api.amit-dobalwork.workers.dev`

Local: same in gitignored `apps/api/.dev.vars`.  
Mobile day-test: `EXPO_PUBLIC_API_BASE_URL` + `EXPO_PUBLIC_ALLOW_DEV_AUTH=true`. Google mobile client env vars are optional leftovers; the Google button always shows.

## Prove

```bash
curl -sS https://mirra-api.amit-dobalwork.workers.dev/api/auth/ok
# expect {"ok":true,"google":true}
```

Opening Continue with Google must hit **accounts.google.com** (or API `/api/auth/sign-in/social` → Google) — **never** `auth.expo.io`. Consent app name = **Mirra**. Evidence: `/tmp/mirra-qa/google-better-auth-social/`.

## Signup before Pro

Purchase / restore / Start trial require `requireSignedInUser()` (`authMode === "google"`). Dev Tester (`setDevSession`) can enter free tabs for day-test QA but **cannot** claim Pro via paywall CTAs. Close / “Continue without Pro” sends unsigned users to auth (`postAuthIntent: "tabs"`); Google success with `postAuthIntent: "paywall"` returns to the paywall. After Google, call `getPurchases().logIn(userId)`. Evidence: `/tmp/mirra-qa/signup-before-pro/`.

## EAS day-test

Republish `day-test` after auth changes. Point `EXPO_PUBLIC_API_BASE_URL` at the Worker. Google Web/iOS client ids on mobile are optional for Better Auth social.

## Follow-ups (P1)

- Create project id `mirra-app` after quota; migrate clients
- Standalone iOS client for `ai.mirra.app` when leaving Expo Go
- Turn off `ALLOW_DEV_USER_HEADER` for real prod
