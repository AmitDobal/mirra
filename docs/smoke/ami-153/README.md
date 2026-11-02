# AMI-153 smoke

`smoke-output.txt` — `apps/api/scripts/smoke-meal-revise.mjs` against local `wrangler dev` (heuristic AI, local D1 with migration 0014).

Loop: baseline 4 slots → preview "I only eat two times a day" (before/after rows, nothing written, pref unset) → confirm with the previewed `intent` and garbage free text (applies, plan = lunch + dinner, pref = 2) → repeat = "already set to 2 meals" with zero changes → stale confirm applies nothing → diet change keeps 2 slots → equipment swap preview/confirm still works → "3 meals a day" = breakfast, lunch, dinner.

Offline: `npm run test:meal-revise -w @mirra/api`. Mobile row mapping: `node --test src/features/coach/proposal-rows.test.ts`.
