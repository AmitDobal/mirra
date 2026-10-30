# SMOKE — Mirra GOAL tester

**When:** 2026-10-31 · **Verdict:** **PASS**

## Checklist

| Check | Result |
| --- | --- |
| `npm run typecheck -w @mirra/mobile` | PASS (exit 0) |
| `npm run typecheck -w @mirra/api` | PASS (exit 0) |
| API curl E2E (`x-mirra-user-id: goal-test-1`) | PASS |
| Routes (splash→auth, tabs, workout) | PASS (file tree) |
| `npx expo export --platform ios` | PASS (Metro + Hermes `.hbc`) |

### API E2E (wrangler `:8787`)

health 200 → onboarding PUT 200 → plans/generate 201 → job `done` → current 200 (7 days / 3 workouts) → today 200 → meal 201 → fuel 200 → check-in 201.

First generate hit worker mid-restart (503); retry after ~2m succeeded. No migrate needed (local D1 already up).

### Routes present

- Onboarding: `splash` → `auth` (+ welcome…week-reveal/paywall)
- Tabs: `today`, `fuel`, `coach`, `progress`, `you`
- Workout: `live`, `complete`

### Fixes applied during smoke

- `week-reveal.tsx` — map API workouts → mutable onboarding types (tsc)
- `revenuecat.ts` — `require` instead of dynamic `import` (Hermes export)

## How to run

```bash
# API (terminal 1)
npm run api:dev
# or: cd apps/api && npx wrangler dev --port 8787
# migrate if empty: npm run db:migrate:local -w @mirra/api

# App (terminal 2)
npm run mobile
# Expo Go / simulator; API base defaults to local wrangler
```
