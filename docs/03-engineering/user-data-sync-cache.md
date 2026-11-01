# User data sync and cache

**Status:** architecture note (runtime on `main` as of PRs #38–#40).  
**Related:** `d1-schema.md`, `architecture.md`, `ai-context-and-credits-architecture.md`, `security.md`.

## Layers

| Layer | Role | Authority |
| --- | --- | --- |
| **D1 + R2 (API)** | Durable user-owned data and media metadata | **Source of truth** |
| **Mobile SQLite** | Offline reads, optimistic writes, sync mirror | Mirror; reconcile to API |
| **SecureStore + in-memory** | Session cookies, identity snapshot, short TTL caches | Convenience only; never authoritative |

```text
                    ┌─────────────────┐
  Expo app ────────►│ GET/PATCH REST  │──────► D1 (users, profiles, preferences,
                    │ + signed R2     │        plans, meals, check_ins,
                    └────────┬────────┘        progress_photos, credits ledger…)
                             │
                             ▼
                    ┌─────────────────┐
                    │ SQLite mirror   │  write-through / pull-merge on hydrate
                    └─────────────────┘
```

## Source of truth (D1 + R2)

Persist on the Worker (see `d1-schema.md`):

- **Identity:** `users`, `sessions`, `accounts` (Better Auth)
- **Profile / onboarding:** `profiles`, `preferences`
- **Plans:** `plans`, `plan_days`, `workouts`, … (week workout plan)
- **Logs:** `meals`, `check_ins`, `workout_sessions`, `weight_logs`, …
- **Progress:** `progress_photos` rows + **`media_objects` / R2** for bytes
- **Billing / AI:** `entitlements`, `ai_credit_*` tables (ledger)

R2 holds photo and meal media; D1 stores keys, ownership, and confirm state. Client never treats a local file path as shared across devices.

## Mobile SQLite (offline mirror)

Location: `apps/mobile/src/db/`. Repositories map API shapes into local tables (`plans`, `meals`, `progress_photos`, …).

**Pattern:**

1. **Read path:** hydrate from SQLite first for instant UI; refresh from API when online.
2. **Write path:** local insert/update where UX needs immediacy; API call follows (or queues on failure).
3. **Reconcile:** server ids win on conflict; use `reassign-user` when auth user id changes after login.

SQLite is **not** a second source of truth for multi-device: two phones must converge via API + D1.

## Identity: `me-store` (SecureStore + TTL)

File: `apps/mobile/src/stores/me-store.ts`.

- **`GET /v1/me`** returns profile, preferences, entitlement, linked accounts.
- **`ensureMe()`** dedupes concurrent callers (single-flight), applies a **10-minute in-memory TTL**, and persists a **small identity slice** to SecureStore (`mirra.me.identity`: user, accounts, entitlement) for instant You-tab hero before network.
- Helpers (`getFoodPrefs`, `getTrainerPersona`, goal weight) should go through **`ensureMe()`**, not raw `getMe()` per screen — avoids **N× `/v1/me`** on tab mounts.
- **`refreshInBackground()`** updates cache without blocking UI; failures keep the last good cache.
- **`clear()`** on sign-out wipes memory + SecureStore.

Full `/v1/me` body is not duplicated in SQLite; prefs that drive generation live in D1 and round-trip through onboarding/PATCH routes.

## AI credits: `GET /v1/credits`

- **Ledger lives in D1** (`ai_credit_ledger`, reservations, balance). Client **never** computes remaining credits locally.
- Mobile: `apps/mobile/src/lib/api/credits.ts` → **`getCredits()`** for meters and gating UX.
- **`mode`** may be `off` | `shadow` | `enforce`; UI should still read `/v1/credits` in shadow so meters match server.
- Treat **402 / `ai_credits_exhausted`** as authoritative; do not cache credit balance across sessions beyond a short UI refresh (re-fetch on Coach/Fuel AI entry).

## Progress photos (multi-device)

- **API:** paginated `GET /v1/progress/photos`, create with `mediaId` after R2 upload confirm (`routes/progress.ts`).
- **Mobile:** `progress-store` lists local rows, **pulls remote pages**, **upserts mirror** (`upsertProgressPhotoMirror`), caches media via `cacheProgressPhotoMedia` for offline viewing.
- New device: gallery fills from API; thumbnails download to local uri when `hasMedia`.
- Local-only captures sync up on create flow (upload → POST → mirror row with server id).

## Week workout plan (persist until regenerate)

- **SoT:** current ready plan in D1 (`GET /v1/plans/current` or equivalent).
- **`ensureCurrentWeekPlan()`** (`lib/api/ensure-plan.ts`): returns existing ready plan; **does not** call generate if days already exist. One-shot generate only when missing (e.g. post-onboarding gap).
- **Explicit regenerate only:** Coach rebuild / onboarding generate / user-driven rebuild — not Today tab refresh.
- **Today UI:** `today-store` keeps **`weekDays`** from the stored plan; **`resolveDayIndex`** maps calendar today to the same weekday slot when the calendar week rolled but the plan week has not been replaced (#40).
- **`plan-store`:** in-memory copy of `CurrentPlan` for cross-screen consistency; optional `mirrorPlanToLocal` into SQLite for offline Today.

Meal **day** plans are separate (`meal-plan` routes); same rule — persisted rows until user forces regenerate/rebalance.

## What NOT to cache

| Do not cache locally as truth | Why |
| --- | --- |
| OAuth tokens / refresh secrets | SecureStore session bridge only; see `lib/auth/` |
| Webhook-derived entitlement | Read from `/v1/me` or RC SDK; D1 updated server-side |
| One-shot AI outputs (coach advise, meal estimate, voice TTS, plan-gen LLM) | Non-deterministic, credit-metered; use feature-level day cache only where documented |
| Raw LLM prompts / `ContextEnvelope` | Log hashes server-side only |
| Other users’ data | Strict `user_id` on every query |
| R2 presigned URLs long-term | Short-lived; re-sign on fetch |

## Optional future: Workers KV

Not required for v1. Reasonable later uses (edge read models only, still D1-backed):

- Rate-limit counters (already pattern in sprint kit)
- Idempotency keys for upload confirm
- Read-through cache for **`GET /v1/plans/current`** or public config

Any KV cache must be **invalidated on write** (rebuild, PATCH prefs) or TTL-bound with D1 as tie-break.

## Quick reference

| Need | Call / store |
| --- | --- |
| Who am I + prefs snapshot | `useMeStore.ensureMe()` |
| Credit meter | `getCredits()` |
| Week workouts | `ensureCurrentWeekPlan()` → mirror SQLite |
| Progress gallery | Local list + `listProgressPhotosApi` + media cache |
| Sign out | `me-store.clear()` + auth session clear |
