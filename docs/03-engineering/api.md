# Mirra — API design (v1)

**Base:** `https://api.<domain>/v1`  
**Auth:** Better Auth session (cookie + Bearer for native)  
**Errors:** `{ "error": { "code": "…", "message": "…" } }` + request id header `x-request-id`  
**Validation:** Zod on every input (shared `packages/contracts`)

## Screen → API map

| Screen | Methods |
| --- | --- |
| S01–S09 onboarding local | mostly client; flush on S10/S12 |
| S10 Mirror | `POST /media/upload-url` → PUT R2 → `POST /media/confirm` |
| S11 | `GET /plans/jobs/:id` poll |
| S12 | `GET /plans/current` |
| S13 | client RevenueCat; server webhook |
| S14 | Better Auth `/auth/*` |
| S15 Today | `GET /today` |
| S16–S17 | `POST /workouts/sessions` · `PATCH …/sets` · `POST …/complete` |
| S18–S19 | `GET /fuel/today` · `POST /meals` |
| S20 | `POST /check-ins` |
| S21 | `POST /plans/rebuild/preview` · `…/apply` |
| S22–S23 | `GET /progress/photos` · upload flow |
| S24 | `GET /me` · settings PATCH |

---

## Endpoints

### Health
- `GET /health` → `{ ok: true, version }`

### Auth
- Better Auth handler mount: `/auth/*` (Apple, Google, email)
- `GET /v1/me` → user + profile + entitlement summary

### Onboarding
- `PUT /v1/onboarding`  
  Body: profile + preferences (Zod). Upserts. Idempotent.
- `POST /v1/plans/generate`  
  Enqueues job. Returns `{ jobId }`. Requires onboarding complete.
- `GET /v1/plans/jobs/:jobId`  
  `{ status, planId?, error? }`

### Plans
- `GET /v1/plans/current` → plan + days + workouts + exercises
- `POST /v1/plans/rebuild/preview`  
  Body: `{ checkInId?, reason }` → `{ before, after, diffs[] }` (not persisted)
- `POST /v1/plans/rebuild/apply`  
  Body: `{ previewToken }` or full after-snapshot hash → new plan version

### Today
- `GET /v1/today?date=YYYY-MM-DD`  
  Aggregates: today’s workout, fuel remaining, week strip, check-in due flag

### Workouts
- `POST /v1/workouts/sessions` `{ workoutId }` → session
- `POST /v1/workouts/sessions/:id/sets` log set
- `POST /v1/workouts/sessions/:id/complete` `{ rpe?, notes? }`
- `POST /v1/workouts/sessions/:id/swap-exercise` `{ exerciseId, replacementId? }`

### Fuel
- `GET /v1/fuel/today`
- `POST /v1/meals`
- `PATCH /v1/meals/:id` · `DELETE /v1/meals/:id`

### Check-ins
- `POST /v1/check-ins` `{ localDate, status, note? }`  
  If `skipped` (policy): may auto-enqueue rebuild preview flag
- `GET /v1/check-ins?limit=3`

### Media
- `POST /v1/media/upload-url` `{ kind, contentType }` → `{ mediaId, uploadUrl, headers, expiresAt }`
- `POST /v1/media/confirm` `{ mediaId }`
- `POST /v1/progress/photos` `{ mediaId, pose, takenAt }`
- `GET /v1/progress/photos`

### Weight
- `POST /v1/weight` · `GET /v1/weight?limit=`

### Entitlements
- `GET /v1/entitlements` (mirror of RC + DB)
- `POST /v1/webhooks/revenuecat` (raw body + signature)

### Settings
- `PATCH /v1/preferences`
- `DELETE /v1/me` → `{ ok: true }` hard delete (R2 + D1 + sessions); see `account-deletion.md`

---

## AuthZ rules

- Every `/v1/*` except health, auth, RC webhook requires session
- Webhook: signature only, no user session
- Row access: `user_id = session.userId` always
- Pro gates (server): `force` meal-plan regenerate, rebuild apply — `requirePro` / `entitlements`. Matrix: `api-auth-matrix.md`

## Idempotency

- `Idempotency-Key` header on: plan generate, rebuild apply, meal create, session complete
- Store key → response hash in D1 for 24h

## Pagination

Cursor `?cursor=&limit=` (max 50) on lists; v1 photos/meals/check-ins.

## Versioning

`/v1` only. Breaking changes → `/v2`. Contracts package exports versioned Zod.
