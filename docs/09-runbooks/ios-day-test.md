# Run Mirra on your iPhone (laptop off) — day test

Expo Go + laptop Metro **cannot** survive laptop sleep/off. You need:

1. **API on the internet** (Cloudflare Worker)
2. **JS app hosted** (EAS Update) opened in **Expo Go** on the phone  
   — or a full **EAS Build** IPA (needs Apple Developer Program) if you outgrow Expo Go

## Live right now (2026-10-31)

| Piece | Value |
| --- | --- |
| API | https://mirra-api.amit-dobalwork.workers.dev |
| Health | `GET /health` → `{"ok":true,"version":"0.1.0"}` |
| Dev user header | `x-mirra-user-id: day-test-1` (ALLOW_DEV_USER_HEADER=true) |
| Google OAuth | See `mirra-google-oauth.md` — sim uses **Continue as Dev Tester** |
| Expo project | https://expo.dev/accounts/amitdobal141/projects/mirra |
| Latest update | https://expo.dev/accounts/amitdobal141/projects/mirra/updates/0d497585-77d9-4c12-8118-f0d5187984ac |
| iOS update ID | `01a19247-48c4-710e-9f3a-584fb4b72789` |
| iOS manifest (Expo Go) | https://u.expo.dev/update/01a19247-48c4-710e-9f3a-584fb4b72789 |
| Local API first | `cd apps/api && npx wrangler dev --port 8787` then `API_BASE=http://127.0.0.1:8787 node scripts/smoke-*.mjs` |
| Trainer smoke | `API_BASE=http://127.0.0.1:8787 node scripts/smoke-trainer-persona.mjs` |
| Branch / channel | `day-test` |
| Runtime | `exposdk:58.0.0` (Expo Go SDK 58) |

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
# optional spoken cues: wrangler secret put ELEVENLABS_API_KEY
npx wrangler d1 migrations apply mirra-db --remote
npx wrangler deploy
# local sim against wrangler dev:
npx wrangler d1 migrations apply mirra-db --local
```

### Republish mobile after JS changes

```bash
cd apps/mobile
EXPO_PUBLIC_API_BASE_URL=https://mirra-api.amit-dobalwork.workers.dev \
EXPO_PUBLIC_MIRRA_USER_ID=day-test-1 \
npx eas-cli update --branch day-test --environment preview --message "…" --non-interactive
```

## B. Standalone IPA (best feel, Apple Developer required)

`eas build --platform ios --profile preview` → install via internal link / TestFlight.

## Limits

- Without deployed API, coach/plan AI will fail when laptop is off
- Expo Go only includes Expo-compatible native modules (OK for current Mirra stack with RC stubbed)
- `ALLOW_DEV_USER_HEADER` must be off before any real prod launch
- Cloudflare resources: D1 `mirra-db` (`853253fb-289b-4ef1-a2b8-5f0b17f415e8`), R2 `mirra-media`
