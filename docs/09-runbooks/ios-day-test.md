# Run Mirra on your iPhone (laptop off) — day test

Expo Go + laptop Metro **cannot** survive laptop sleep/off. You need:

1. **API on the internet** (Cloudflare Worker)
2. **JS app hosted** (EAS Update) opened in **Expo Go** on the phone  
   — or a full **EAS Build** IPA (needs Apple Developer Program) if you outgrow Expo Go

## Live right now (2026-11-01)

| Piece | Value |
| --- | --- |
| API | https://mirra-api.amit-dobalwork.workers.dev |
| Health | `GET /health` → `{"ok":true,"version":"0.1.0"}` |
| Dev user header | `x-mirra-user-id: day-test-1` (ALLOW_DEV_USER_HEADER=true) |
| Google OAuth | Better Auth browser social → accounts.google.com (see `mirra-google-oauth.md`); **never** auth.expo.io |
| Expo project | https://expo.dev/accounts/amitdobal141/projects/mirra |
| Latest update group | https://expo.dev/accounts/amitdobal141/projects/mirra/updates/64a38f07-8173-433d-9fb6-dafc30072add |
| iOS update ID | `01a195bd-58de-73a6-9e7d-5c25cf639aab` |
| iOS manifest (Expo Go) | https://u.expo.dev/update/01a195bd-58de-73a6-9e7d-5c25cf639aab |
| Branch / channel | `day-test` |
| Runtime | `exposdk:58.0.0` (Expo Go SDK 58) |
| Message | `session restore + You profile real user` |
| Smoke shots | `/tmp/mirra-qa/user-base-e2e/` |
| Bundle prove | Commit `b075860` (#34+#35); cold-start → today; You from `GET /v1/me` |
| API prove | `GET /v1/me` includes `user` + `accounts` (google-linked user has providerId google) |
| Smoke note | **PASS** (logic+API) — device deep-link not re-proven; see `RESULT.txt` |

### Open on phone (laptop can be off)

1. Install **Expo Go** from the App Store (SDK 58).
2. Sign into Expo Go as **amitdobal141** (same account that owns the project).
3. Open the latest update on the phone (link refreshed after each `eas update`):
   - Project updates: https://expo.dev/accounts/amitdobal141/projects/mirra/updates  
   - Tap the newest **day-test** update → **Open in Expo Go**
4. Phone needs **internet** for AI coach / plan generate (OpenAI via Worker). Local SQLite still works offline for logged data.

### Redeploy API after code changes

```bash
cd apps/api
npx wrangler secret put OPENAI_API_KEY   # once
npx wrangler d1 migrations apply mirra-db --remote
npx wrangler deploy
```

### Republish mobile after JS changes

```bash
cd apps/mobile
# Prefer --platform ios (web export fails on expo-sqlite wasm).
# Load WEB + IOS client ids from local apps/mobile/.env (gitignored). Do not echo.
# EAS --environment preview is required (SDK 58). Keep EXPO_PUBLIC_GOOGLE_* in
# EAS preview via `eas env:set` AND export them in this shell so Metro inlines
# static process.env.EXPO_PUBLIC_* (dynamic process.env[key] stays empty).
# Always npm install at repo root first (EAS fails without node_modules / expo-router).
set -a && . ./.env && set +a
EXPO_PUBLIC_API_BASE_URL=https://mirra-api.amit-dobalwork.workers.dev \
EXPO_PUBLIC_MIRRA_USER_ID=day-test-1 \
EXPO_PUBLIC_ALLOW_DEV_AUTH=true \
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="$EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID" \
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID="$EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID" \
npx eas-cli update --branch day-test --environment preview --platform ios --message "…" --non-interactive
# Prove: grep dist for apps.googleusercontent.com (hits only; never log full ids)
```

## B. Standalone IPA (best feel, Apple Developer required)

`eas build --platform ios --profile preview` → install via internal link / TestFlight.

## Limits

- Without deployed API, coach/plan AI will fail when laptop is off
- Expo Go only includes Expo-compatible native modules (OK for current Mirra stack with RC stubbed)
- `ALLOW_DEV_USER_HEADER` must be off before any real prod launch
- Cloudflare resources: D1 `mirra-db` (`853253fb-289b-4ef1-a2b8-5f0b17f415e8`), R2 `mirra-media`
