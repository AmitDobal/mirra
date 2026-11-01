# Account deletion (delete all my data)

**Status:** architecture 2026-11-01. Product CTA was missing; schema cascades mostly ready.

## Goal

From **You → Danger zone**, the signed-in user can permanently delete their Mirra account and all personal data: D1, R2 media, Better Auth sessions/accounts, and on-device SQLite + SecureStore.

## UX

1. You footer: **Delete account** (destructive) below Sign out.  
2. Confirm sheet / Alert: type **DELETE** or two-step Confirm. Copy: irreversible; meals, workouts, photos, plan prefs gone.  
3. On success: wipe local state → route to welcome / onboarding.  
4. Guest / Dev Tester without Google: still allow wipe of local + server rows for that `userId` if authenticated via session or day-test header (day-test only).

No soft-delete tombstone in v1 (hard delete). Retain anonymized `payment_events` for MoR/audit (set `user_id` null, strip PII in metadata if any).

## API

`DELETE /v1/me` (auth required).

Order (single Worker request; keep under CPU limits):

1. Resolve `userId` from session (never trust body id).  
2. List `media_objects` for user → `ObjectStore.delete` each key (or `deletePrefix` for `meal|mirror|progress/{userId}/`).  
3. Manual delete non-FK tables for user:  
   `ai_usage_events`, `ai_usage_daily`, `ai_credit_periods`, `ai_credit_reservations`, `ai_credit_ledger`, `referral_codes` / redemptions owned by user, `audit_log` rows for user, `rate_limits` keys for user if scoped.  
4. Anonymize `payment_events` where `user_id = ?` (`user_id = null`).  
5. `DELETE FROM users WHERE id = ?` — FK cascades cover profiles, prefs, sessions, accounts, plans, meals, workouts, media_objects rows, rollups, meal_analysis_jobs, attendance, recipe chats, check-ins, etc.  
6. Return `{ ok: true }`. Idempotent: already-gone user → 401/404.

Also: `POST /v1/me/export` optional later; not in this wave.

## Mobile

1. Call `DELETE /v1/me` with bearer.  
2. Local wipe helper `wipeLocalUserData()`:  
   - delete all SQLite rows for `user_id` (or drop+recreate schema / `DELETE FROM` every user table)  
   - `clearSession`, `clearMe`, `clearCredits`, reset onboarding/fuel/history stores  
   - SecureStore keys for Mirra  
3. Navigate to `/(onboarding)/welcome` (or index cold-start).

## Edge cases (smoke)

| # | Case |
| --- | --- |
| 1 | Google user deletes → cannot GET /v1/me with old token |
| 2 | Media gone from R2 (or best-effort log if object missing) |
| 3 | Local reopen → welcome, no Today restore |
| 4 | Mid-delete network fail → retry safe; partial R2 OK if retry |
| 5 | Unauth DELETE → 401 |
| 6 | After delete, same Google signup → new empty user id |
| 7 | Dev Tester day-test header wipe works locally |

## Non-goals

Apple App Store “Sign in with Apple” token revoke API (add when native Apple auth ships). RevenueCat subscriber cancel (stub purchases today).

## Ship

Tickets: API wipe service + route; mobile UI + local wipe; smoke + EAS.
