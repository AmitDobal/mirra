# User tenure scenarios

Coach and insights scale the history window with account age (`users.createdAt`).
Code: `apps/api/src/services/user-tenure.ts`, `personal-context.ts`, `history-summary.ts`, `coach-context.ts`.

## Rule

`tenureDays = max(0, floor((now - users.createdAt) / 1 day))`

| tenureDays | historyWindowDays |
| --- | --- |
| 0 to 6 | `tenureDays` (0 becomes 1) |
| 7 to 13 | 7 |
| 14 to 20 | 14 |
| 21 and up | 21 (cap) |

The window ends yesterday (today is partial and excluded from averages and misses).
Summary text stays one line: `Nd: avg kcal ...; lifts missed a/b; streak Nd; check-ins: ...`. No meal names.

## Context fields

`GET /v1/insights/today` and the coach input carry:

- `joinedAt` (`YYYY-MM-DD`, UTC, or null), `tenureDays`, `historyWindowDays`, `history.windowDays`
- `briefing` ends with `... · Weight 80kg · 6kg above goal · Joined 2026-10-31 (0d)` (weight part only when known)
- Coach context string: `history: Joined 2026-10-31 (0d) | 1d: ...`
- OpenAI coach input: `HISTORY: "Joined YYYY-MM-DD (Nd) | <summary>"`

## Scenarios

| Scenario | How it arises | tenureDays | Window | Expected context | UI notes |
| --- | --- | --- | --- | --- | --- |
| Guest (dev header only) | `x-mirra-user-id` upserts a `users` row on first call | 0 | 1d | Same fields as new; `joinedAt` is today. No Better Auth session | Dev Tester only. Treat as day 0. Never show a real name or email |
| New (day 0) | Just onboarded | 0 | 1d | `historySummary` like `1d: no meals logged; no lifts planned; streak 0d; check-ins: none` | Empty-first: no streak, no "missed" call-outs, show onboarding wins |
| 10 days | Week one done | 10 | 7d | Real averages and misses over 7 days | Show 7-day trend and streak |
| 15 days | Two-week mark | 15 | 14d | Averages over 14 days | Two-week trend is ready |
| 20 days | Just under 3 weeks | 20 | 14d | Same window as 15d | No change until day 21 |
| 60 days | Established | 60 | 21d (cap) | 21-day averages, streak lookback 21 | Full history copy allowed |
| 6 months | Long-term | ~180 | 21d (cap) | Same as 60d. Token cost does not grow | Same UI as 60d |

If the `users` row is missing, `joinedAt` is null, `tenureDays` is 0 and the Joined part is omitted.

## Re-run smokes

Start the API (`cd apps/api && npx wrangler dev --port 8787`). Apply migrations if needed:
`npx wrangler d1 migrations apply mirra-db --local`.

```bash
cd apps/api

# Isolation (A vs B) + day-0 tenure. Works against any deployed API.
API_BASE=http://127.0.0.1:8787 node scripts/smoke-isolation-tenure.mjs

# Full tenure matrix (10/15/20/60/180d): back-dates users.created_at in LOCAL D1 via wrangler.
API_BASE=http://127.0.0.1:8787 SMOKE_LOCAL_D1=1 node scripts/smoke-isolation-tenure.mjs

# Also generate a workout plan + meal plan for A and check B cannot log on it (may cost LLM tokens).
API_BASE=http://127.0.0.1:8787 SMOKE_LOCAL_D1=1 SMOKE_MEAL_PLAN=1 node scripts/smoke-isolation-tenure.mjs

# Coach style: no U+2014 and no ";" in advise message (use after the sanitizer deploys).
API_BASE=http://127.0.0.1:8787 SMOKE_ASSERT_STYLE=1 node scripts/smoke-isolation-tenure.mjs
```

Other smokes (same pattern): `scripts/smoke-weight.mjs`, `scripts/smoke-plan-chat.mjs`,
`scripts/smoke-ai-budget-voice.mjs`, `scripts/smoke-cuisine-pagination.mjs`, and
`node apps/mobile/scripts/smoke-api.mjs` (E2E flows, see `e2e-smoke-flows.md`).

Notes:

- Local D1 back-dating needs the API and wrangler to share `.wrangler/state` (default). Use `SMOKE_PERSIST_TO` if you run the dev server with `--persist-to`.
- Deployed Workers cannot be back-dated from the script. Without `SMOKE_LOCAL_D1=1` the 10d to 180d rows print `SKIP`.
- Meal routes today: `GET/POST /v1/meals`, `PATCH/DELETE` by id. `GET /v1/meals/:id` is not implemented, so that probe prints `SKIP`.

## Last run results (2026-10-31)

| Suite | Target | Result |
| --- | --- | --- |
| `smoke-ai-copy.mjs` | pure | ALL PASS (24) |
| `smoke-user-crud.mjs` | prod Worker | ALL PASS |
| `smoke-isolation-tenure.mjs` + `SMOKE_LOCAL_D1=1` + `SMOKE_MEAL_PLAN=1` + `SMOKE_ASSERT_STYLE=1` | local 8787 | ALL PASS (isolation A/B, tenure 0/10/15/20/60/180, coach style no em dash / no `;`) |
| `smoke-isolation-tenure.mjs` (default) | prod | ALL PASS for day-0 + isolation; tenure 10–180 SKIP without local D1 |
| User CRUD layer | API + mobile | Meals / planned items / exercises PATCH+DELETE; other user → 404 |
| iOS Simulator E2E (tabs) | Expo Go day-test | Partial: update loads; Dev Tester was missing until `extra.allowDevAuth: true` republish |

Also: `docs/03-engineering/user-owned-plans-and-ai-context.md`, `scripts/smoke-user-crud.mjs`.
