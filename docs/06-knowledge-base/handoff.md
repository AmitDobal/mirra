# Handoff

## G2-TEST results

**Verdict:** typecheck + curl **green** — do not mark product Done yet (mock-heavy tabs remain).

| Check | Result |
| --- | --- |
| `@mirra/contracts` typecheck | PASS |
| `@mirra/api` typecheck | PASS |
| `@mirra/mobile` typecheck | PASS (fixed `kind` → `HeuristicDay["kind"]` in `plan-persist.ts`) |
| Curl `:8787` health | PASS 200 |
| Curl onboarding PUT | PASS 200 |
| Curl plans/generate → job | PASS 201 (`status=done`) |
| Curl `/v1/today` | PASS 200 |
| Curl workout session POST | PASS 201 |
| Metro `:8081` | PASS (running); opened `exp://192.168.1.3:8081` on iPhone 16 Pro `A4780736-…` |

**Mock still primary UI (features):**
- Full/mostly mock: `YouScreen`, `CoachScreen`, `CompleteScreen`, `LogMealScreen`
- Heavy mock + some live: `ProgressScreen`, `CompareScreen`, `RebuildScreen`
- Live + mock fallbacks: `TodayScreen`, `FuelScreen`
- Re-exports only: `*/index.ts` → `./mock`

**Gaps:** plan job status is `done` (not `ready`/`completed`); Expo Go sim load not visually QA’d beyond openurl; mock chrome on Coach/You/Progress/Complete/LogMeal.

## 2026-10-31 — G2-HOME tabs wired

**Done:** [Wire all tab screen actions](2c52e764-3cbb-4e78-8e82-1948ff263181) — Today/Fuel/Workout/Coach/Progress/You live actions.

**Done also:** [Onboarding memory→SQLite swap](4c263125-7401-471c-a04d-8ecc9a46af00) — plan/profile in `mirra.db`

**G2-TEST:** [Mirra G2 tester smoke](26273549-2830-430a-8ee2-ae419dc3fe2c) — typecheck+curl+Expo open **PASS**; product not Done (mocks remain).

**Done:** [Unmock remaining Mirra screens](b8da6f46-7b36-413e-a17f-7ea71d76b2d1) — screens off `./mock`, typecheck pass.

**Done:** [listProgressPhotos + delete mocks](13406ecf-ff94-4e07-a832-538ed7b0464a)

**G2 wave:** SQLite local-first + API workouts/rebuild + screens unmocked + typecheck/curl green. Push to `AmitDobal/mirra`.

**Next:** typecheck + curl + Expo reload; push if green.

## 2026-10-31 — G2-API + G2-ONB landed

**Done:** API curl-green · onboarding generate wired · ensureMirraDb boot

## 2026-10-31 — G2-SQL landed

**Done:** [Mobile expo-sqlite local DB](b61bc6df-9113-4ed3-ab12-9ead0189f314)

## 2026-10-31 — G2 working product (SQLite + wire all buttons)

**Decision:** Mobile **expo-sqlite local-first** + CF D1 API write-through.

## 2026-10-31 — GOAL kickoff (running app)

**Objective:** Stitch-faithful Mirra, Expo + Hono API, RevenueCat port, core flows, tested & running.

**Parallel builders (path-locked):**
- [Download Stitch AIDA assets](7751f527-186e-4af4-9b2b-0f1635e9afd5)
- [Onboarding screens S01-S14](c153c727-e160-44d0-b7bb-4580e887c26c)
- [Tab screens S15-S24 shells](9e144154-c923-4e01-936e-ebbad8b7763b)
- [API core flow routes](ad1aaff0-c756-4c15-a67f-6d1ed7b9ac20)
- [RevenueCat port + API client](d367ffea-8f7e-4684-a6ff-186aff84f15e)

**PM:** orchestrate only; next wave = integrate + tester after returns.

## 2026-10-31 — W1-3/W1-4 API + contracts landed

**Done**
- [API Worker D1 schema](f3bf59d7-19b2-4f81-8034-f9f18f5faca1): Hono + D1/R2 + `0001_init.sql`, `/health`, `/v1/me` 401, Zod contracts, ports stubs
- Run: `npm run api:dev` · migrate local first if needed

**Still todo**
- W1-2b asset download · W1-5 screen shells · W1-6 PurchasesPort
- Better Auth mount; real CF D1/R2 ids for remote

**Next**
1. W1-2b download Stitch images
2. W1-5 shells vs screen.png
3. Auth wiring ticket (new) when ready

## 2026-10-31 — W1-1 mobile landed

**Done**
- [Expo mobile theme scaffold](df033f01-df7a-4bd9-b965-8e84220e6271): Expo 57 + Stitch tokens + TabDock

## 2026-10-31 — W1-2 inventory landed

**Done**
- [Stitch asset inventory](eec9ea45-21dd-4d61-867d-afb45b3dbfbd) → `stitch-assets.md`; S11+S24 PNG missing

## 2026-10-31 — Eng design + Stitch golden + Wave 1 kickoff

**Done**
- Stitch folder = UI SoT; eng docs; RevenueCat lock; Wave 0.5 done
