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
| Expo project | https://expo.dev/accounts/amitdobal141/projects/mirra |
| Latest update | https://expo.dev/accounts/amitdobal141/projects/mirra/updates/4d10a299-539e-4f9e-bd33-32c6fdc70546 |
| iOS manifest (Expo Go) | https://u.expo.dev/update/01a18e95-5968-7048-a662-b00a59a9c9cf |
| Branch / channel | `day-test` |
| Runtime | `exposdk:57.0.0` (Expo Go SDK 57) |

### Open on phone (laptop can be off)

1. Install **Expo Go** from the App Store (SDK 57 compatible).
2. Sign into Expo Go as **amitdobal141** (same account that owns the project).
3. Open the update page on the phone Safari, or paste the iOS manifest URL into Expo Go:
   - Update dashboard: https://expo.dev/accounts/amitdobal141/projects/mirra/updates/4d10a299-539e-4f9e-bd33-32c6fdc70546  
   - Tap **Open in Expo Go**
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
