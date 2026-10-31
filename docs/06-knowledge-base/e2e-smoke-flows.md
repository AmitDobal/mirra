# Mirra E2E smoke — flow evidence (2026-10-31)

Command: `node apps/mobile/scripts/smoke-api.mjs` against local API (`ALLOW_DEV_USER_HEADER=true`).

| Flow | How verified | Result |
| --- | --- | --- |
| Health | `GET /health` | PASS |
| Auth — unauthenticated | `GET /v1/me` no header | 401 PASS |
| Auth — Dev Tester path | `x-mirra-user-id` on all writes | PASS |
| Auth — Better Auth Bearer | `POST /v1/dev/session` → `GET /v1/me` Bearer only | PASS |
| Auth — Google provider | `POST /api/auth/sign-in/social` (bogus token) | 401 `INVALID_TOKEN` (provider live) |
| Plan / onboarding | Fresh user PUT onboarding + generate | 3 workouts / 7 days |
| Meals / calories | `POST /v1/meals` + `GET /v1/fuel/today` | PASS |
| Workout session / sets | start → log set → complete | PASS |
| Check-ins | `POST /v1/check-ins` + reject bad enum | PASS |
| Progress photos | POST + GET `/v1/progress/photos` | PASS |
| Today / me | `GET /v1/today`, `GET /v1/me` | PASS |
| Coach advise | `POST /v1/coach/advise` | PASS |
| Rebuild | preview + apply | PASS |

**Simulator:** Continue as Dev Tester (no Gmail required).  
**Production Google:** Better Auth + Bearer; keys in API `.dev.vars` / Worker secrets. See `docs/09-runbooks/mirra-google-oauth.md`.
