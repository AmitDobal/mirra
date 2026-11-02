# AMI-160 — Pro / entitled must not hit hard paywall

**Branch:** `feat/ami-160-paywall-entitlement`

## Automated

From repo root:

```bash
node --test apps/mobile/src/lib/auth/tab-entitlement.test.ts \
  apps/mobile/src/lib/purchases/refresh-entitlement-fallback.test.ts \
  apps/mobile/src/lib/auth/cold-start-route.test.ts
pnpm typecheck
```

## Manual (Expo Go)

1. Sign in as a user with **active** or **trial** entitlement on `/v1/me` (or complete purchase / restore).
2. Cold relaunch → land on **Today** (no redirect to hard paywall).
3. Navigate across tab routes → no paywall flash.
4. Dev-only: unentitled user with Zustand `none` but no me cache → still paywall.

## Evidence

Record pass/fail in `RESULT.md` with device + build.
