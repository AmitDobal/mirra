# API auth matrix (Mirra)

Source of truth for public vs private routes, free vs Pro, and day-test header rules.

## Session auth

| Mechanism | When | Notes |
| --- | --- | --- |
| Better Auth session (cookie / `Authorization: Bearer`) | Always preferred | Google OAuth + Expo cookie bridge. Never remove. |
| `x-mirra-user-id` / `x-user-id` | Day-test / local only | Upserts ephemeral `users` row. |

### Day-test header rules (fail-closed)

`ALLOW_DEV_USER_HEADER=true` enables the header **only when not production**.

Production markers (any one):

- `MIRRA_ENV=production`
- `APP_ENV=production`
- `ENVIRONMENT=production`

If any marker is `production`, the header and `POST /v1/dev/session` are **ignored / 401**, even if `ALLOW_DEV_USER_HEADER=true` was left on.

Day-test Worker today: `ALLOW_DEV_USER_HEADER=true`, no production marker. Real prod launch: set `MIRRA_ENV=production` and turn the flag off.

## Route access

| Class | Examples | Auth |
| --- | --- | --- |
| Public | `GET /health`, `GET /api/auth/ok`, Better Auth `/api/auth/*` | None |
| Dev-only | `POST /v1/dev/session`, credits-dev helpers | Dev header gate (fail-closed in prod) |
| Private | All other `/v1/*` | `requireAuth` (session or day-test header) |

`GET /api/auth/ok` returns `{ ok: true }` only (no Google config boolean).

## Free vs Pro (RBAC-lite)

Tiers come from RevenueCat-synced `entitlements` (`active` / `trial` / `grace` → Pro). No admin roles.

| Surface | Free | Pro |
| --- | --- | --- |
| First meal-plan generate / cache hit | Yes | Yes |
| `POST /v1/meal-plan/generate` with `force: true` | **403** (`requirePro`) | Yes |
| Meal swap / rebalance | Yes (credits + daily regen) | Yes |
| Coach advise / revise | Yes (credits) | Yes |
| Meals estimate | Yes (credits) | Yes |
| `POST /v1/plans/generate` (onboarding / first week) | Yes (credits) | Yes |
| `POST /v1/plans/rebuild/preview` | Yes | Yes |
| `POST /v1/plans/rebuild/apply` | **403** (`requirePro`) | Yes |
| Recipe / chef chat | Yes (credits + caps) | Higher caps |

AI spend still goes through the credits ledger (`withAiCredits`, shadow/enforce). Heuristic fallbacks stay free (no reserve settle).

## Related

- Middleware: `apps/api/src/middleware/auth.ts`, `apps/api/src/lib/runtime-env.ts`
- Pro helper: `apps/api/src/lib/entitlement.ts` (`requirePro`)
- Day-test runbook: `docs/09-runbooks/ios-day-test.md`
