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
| Expo project | https://expo.dev/accounts/amitdobal141/projects/mirra |
| Latest update | https://expo.dev/accounts/amitdobal141/projects/mirra/updates/9a0ad4fd-3fbd-4524-8a74-461ccf2e522d |
| iOS update ID | `01a19399-461a-759c-9338-f1ea1c1a2170` |
| iOS manifest (Expo Go) | https://u.expo.dev/update/01a19399-461a-759c-9338-f1ea1c1a2170 |
| Branch / channel | `day-test` |
| Runtime | `exposdk:58.0.0` (Expo Go SDK 58) |
| Message | `day-test: restore tabs sx #17 + insights/actions/voice API` (from `3289337`) |
| Smoke shots | `/tmp/mirra-qa/restore-all-screens/` (today/fuel/coach/progress/you) |
| API prove | `GET /v1/insights/today`, `/v1/today/actions`, `/v1/voice/cue/today` → 200 |

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
CI=1 \
EXPO_PUBLIC_API_BASE_URL=https://mirra-api.amit-dobalwork.workers.dev \
EXPO_PUBLIC_MIRRA_USER_ID=day-test-1 \
npx eas-cli update --branch day-test --environment preview --platform ios --message "…" --non-interactive
```

## B. Standalone IPA (best feel, Apple Developer required)

`eas build --platform ios --profile preview` → install via internal link / TestFlight.

## Limits

- Without deployed API, coach/plan AI will fail when laptop is off
- Expo Go only includes Expo-compatible native modules (OK for current Mirra stack with RC stubbed)
- `ALLOW_DEV_USER_HEADER` must be off before any real prod launch
- Cloudflare resources: D1 `mirra-db` (`853253fb-289b-4ef1-a2b8-5f0b17f415e8`), R2 `mirra-media`
