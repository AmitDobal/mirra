# Handoff

## 2026-11-01 — API #49 + EAS #47/#48 (prod verify)

**Done:** Worker matches `origin/main` **`141fd02`** (#49 api-auth-harden). Curl: `/health` 200; `/v1/me` no auth **401**; `/api/auth/ok` → `{"ok":true}` only (no `google` field).

**Phone:** https://u.expo.dev/update/01a1963b-801d-7e46-b723-4dbc7cd1c2a0 — mobile **#47** + **#48**. Runbook `docs/09-runbooks/ios-day-test.md`. Matrix append: `/tmp/mirra-qa/prod-smoke-matrix/RESULT.md`.

**Next:** Phone smoke on that manifest; keep `ALLOW_DEV_USER_HEADER` dev-only.

## 2026-11-01 — Day-test EAS: credits-store no-flash

**Done:** Clean `origin/main` worktree @ `8054d0a` → `eas update --branch day-test` (“credits-store no Checking flash + prior #38-40”). Live table → iOS `01a195f8-d00b-7be5-99af-c925e5efcb34`.

**Open on phone:** https://u.expo.dev/update/01a195f8-d00b-7be5-99af-c925e5efcb34

**Next:** Physical device kill→relaunch You if needed; prune ship worktrees.

**Evidence:** `/tmp/mirra-qa/credits-no-flash-device/`

## 2026-11-01 — Credits meter no-flash (SecureStore)

**Done:** `credits-store` mirrors `me-store`: persist last `GET /v1/credits` snapshot in SecureStore, hydrate at boot, You tab paints cached remaining/limit instantly; background refresh via TTL + pull-to-refresh. Sign-out clears credits cache.

**Next:** Device prove done via day-test EAS above; keep monitoring no-flash on physical phone.

**Evidence:** `/tmp/mirra-qa/credits-no-flash/RESULT.txt`

## 2026-11-01 — User data sync/cache doc + main #38–#40

**Done:** Architecture note `docs/03-engineering/user-data-sync-cache.md` (D1/R2 SoT, SQLite mirror, me-store SecureStore TTL, `GET /v1/credits`, progress photos API sync, week plan persist until explicit regenerate). `main` at #40 merge (week plan stable).

**Next:** Smoke seat on `origin/main` → **`eas update --branch day-test`** for #38–#40 JS; until then **EAS pending polish wave #38–#40** (prior manifest: https://u.expo.dev/update/01a195bd-58de-73a6-9e7d-5c25cf639aab).

**Watch:** Primary checkout `feat/sx-arbitrary-radius` is dirty — not the ship line.

## 2026-11-01 — User-base session + You (#34/#35)

**Done:** Session hydrate + cold-start lands on Today; You tab reads profile from `GET /v1/me`; sign-out clears local auth/session; D1 `users` + `accounts` wired on API. Merged #34 / #35.

**In progress:** Device prove — kill app and reopen (session restore on phone).

**Next:** Open EAS update on device — https://u.expo.dev/update/01a195bd-58de-73a6-9e7d-5c25cf639aab

**Watch:** Primary checkout is dirty WIP (`feat/sx-arbitrary-radius`) — **not** the ship line; EAS/day-test only from clean `origin/main`.

**Evidence:** `/tmp/mirra-qa/user-base-e2e/`

## 2026-11-01 — Day-test runbook Live → 01a19599

**Done:** `docs/09-runbooks/ios-day-test.md` Live table now points at post-#30 EAS update (was stale `01a1958d`). Smoke path `/tmp/mirra-qa/google-oauth-proxy-fix/`.
**Manifest:** https://u.expo.dev/update/01a19599-0637-7472-8d78-8890a33bfb83
**Dashboard:** https://expo.dev/accounts/amitdobal141/projects/mirra/updates/0019d75e-6dfc-468e-8c1e-2f3ff1d1d34d

## 2026-11-01 — Google OAuth Expo Go proxy PASS

**Done:** Expo Go uses Web client + `auth.expo.io` proxy (no `host.exp.Exponent` iOS client). GCP branding App name → **Mirra** (was kalshi). EAS preview IOS env deleted. Merged #30.
**Manifest:** https://u.expo.dev/update/01a19599-0637-7472-8d78-8890a33bfb83
**Prove:** authorize Web+proxy → account chooser → consent (no invalid_request/kalshi). Bundle WEB hits=1, auth.expo.io=1, host.exp=0. Shots `/tmp/mirra-qa/google-oauth-proxy-fix/`.
**Watch:** Consent chrome may say **expo.io** (proxy domain). Standalone later = iOS client `ai.mirra.app` only.

## 2026-11-01 — Google OAuth EAS env fix PASS

**Done:** Root cause was Metro not inlining dynamic `process.env[key]` (plus empty EAS preview env). Fixed static `EXPO_PUBLIC_GOOGLE_*` in `env.ts`, `app.config.ts` extra, `eas env:set` for preview. Merged #28 (`19383d6`).
**Manifest:** https://u.expo.dev/update/01a1958d-fce8-77e1-b848-1e3d4f8050cd
**Prove:** dist `.hbc` WEB+IOS hits=1 each (len 72). Sim Continue with Google → ASWebAuthenticationSession google.com (not “Google sign-in not configured”). Shots `/tmp/mirra-qa/google-oauth-eas-fix/`.
**Watch:** Always export GOOGLE_* in shell + keep EAS preview vars; never use dynamic env key access for EXPO_PUBLIC_*.

## 2026-11-01 — Restore tabs + insights API day-test PASS

**Done:** Prod Worker serves `GET /v1/insights/today`, `/v1/today/actions`, `/v1/voice/cue/today` (200). Main `3289337` (#17 UI + #20/#21 API). Tab smoke shots in `/tmp/mirra-qa/restore-all-screens/`. EAS day-test republished.

**Open on phone:** https://u.expo.dev/update/01a19399-461a-759c-9338-f1ea1c1a2170

**Watch:** Older Today shot may show pre-deploy insights toast; curl proves routes live now. Primary checkout still dirty WIP — do not EAS from it.

## 2026-11-01 — restore-all-screens merged (PR #17)

**Done:** Polished tab UI on `origin/main`. Today = main attendance (WeekStrip PresenceDot + DayHistorySheet) + local HeroNext/GoalChecklist/RoutineCard+edit/TodayBrief/actions/voice (`sx()`). Coach AdviseCard+AiMoodPills+voice-cue; You SpeakCuesToggle; Fuel/Progress/Workout sx.
**PR:** https://github.com/AmitDobal/mirra/pull/17 · merge `ccc28c8`
**className:** empty under tab features + `app/(tabs)`
**Typecheck:** mobile + api PASS
**Smoke:** `/tmp/mirra-qa/restore-all-screens/` (today/fuel/coach/progress/you + deeplink-fuel) — styled. No EAS.
**P1:** Deployed API 404 on `GET /v1/insights/today` (API route still local WIP). Client now `quiet` until route ports.
**Left local-only:** API insights/voice services, onboarding WIP diffs, research docs on dirty `feat/sx-arbitrary-radius`.
**Next:** Full smoke → EAS from clean `origin/main` only.

## 2026-11-01 — full-smoke PASS + EAS day-test

**Verdict:** PASS — styled 12-step onboarding + S11/S12, plan `ready`/`openai` (`api-plan.json`), weight GET 200 (`x-mirra-user-id`), plan-chat + Progress weight UI evidence.
**EAS:** https://expo.dev/accounts/amitdobal141/projects/mirra/updates/ad37ef04-61bc-4478-b9d3-d3e9c51d6c39  
**iOS manifest:** https://u.expo.dev/update/01a1937c-5804-715c-ae52-6990b300d08a  
**Evidence:** `/tmp/mirra-qa/full-smoke-20261101004921` (+ `10025`).
**P1:** Maestro paywall→tabs `NO_HIER` flakes (use deeplink/dev tester); `eas update` needs `--platform ios` + `babel-preset-expo` in mobile; local Metro dies if smoke worktree removed mid-run.
**Next:** Phone day-test on new update; prune finished worktrees.

## 2026-11-01 — integrate/day-test-all-features merged (PR #14)

**Done:** Plan-chat UI + route, `/v1/coach/revise` + `/v1/ai/usage`, weight journey UI + `/v1/weight`, rule `92-single-integrate-branch`, AGENTS single-ship bullet. Merge `c00282c`.
**Typecheck:** `@mirra/api` + `@mirra/mobile` OK.
**Smoke shots:** `/tmp/mirra-qa/integrate-all-features/` (`plan-chat-open.png`, `weight-log-sheet.png`, `onboarding-step1-of-12.png`).
**P1:** Production API still 404 on `/v1/weight` + `/v1/ai/usage` until Workers deploy from `origin/main` (mobile against live API showed toast).
**Next:** Orchestrator full smoke + EAS from clean `origin/main`. Do not day-test from dirty primary.
**Left local-only:** TodayBrief, SpeakCuesToggle, voice-cue, other WIP under primary `feat/sx-arbitrary-radius` — not on main.

## 2026-10-31 — Styles fixed (StyleSheet; NativeWind removed)

**Root cause:** NativeWind/`react-native-css-interop` + React 19.3 + Reanimated 4.7 throws / no-ops (useReducer dispatch TDZ). Not an Expo Go “CSS file” issue.
**Fix:** Drop NativeWind babel/metro; core UI + welcome/onboarding shell use StyleSheet + theme tokens. Simulator uses Expo Go **58.0.7** (`npx expo-go download ios 58`).
**Phone update:** https://expo.dev/accounts/amitdobal141/projects/mirra/updates/7974e369-c9a1-40ad-a222-cac83b8008e8
**Still TODO:** feature screens that still pass `className` need StyleSheet conversion (className is ignored now).

## 2026-10-31 — Upgraded to Expo SDK 58

**Done:** Mobile `expo@~58` + aligned deps (RN 0.88); Moti transition casts; EAS Update republished for `exposdk:58.0.0` on `day-test`.

**Open on phone:** https://expo.dev/accounts/amitdobal141/projects/mirra/updates → newest day-test → Open in Expo Go 58.

## 2026-10-31 — iOS day-test (laptop off)

**Done:** Cloudflare `mirra-api` deployed; D1 migrate + OpenAI secrets; R2 `mirra-media`; EAS project + Update on branch/channel `day-test`.

| | |
| --- | --- |
| API | https://mirra-api.amit-dobalwork.workers.dev |
| Open on phone | https://expo.dev/accounts/amitdobal141/projects/mirra/updates → Open in Expo Go |
| Runbook | `docs/09-runbooks/ios-day-test.md` |

**Next:** Use Expo Go for ~1 day; note bugs. Republish with `eas update --branch day-test` after JS fixes. Turn off `ALLOW_DEV_USER_HEADER` before real prod.

## 2026-10-31 — GOAL COMPLETE

**Evidence:** [Tester smoke Mirra app](ffde98c0-4dea-47fd-8087-6ee3afbbb96f) + re-verify typecheck/health. See `SMOKE.md`.

**Run:** `npm run api:dev` + `npm run mobile`

**Polish later:** Stitch pixel QA, live Auth/RC keys, S11/S24 PNGs.

## 2026-10-31 — Integrator (G-INT) closed

**Done:** [Integrate API purchases assets](d25fc8cc-2608-48b8-8c82-e40f2327e5cd)

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

## 2026-10-31 — OpenAI co-coach live

**Done**
- [OpenAI PlanGenerator + Coach API](7e3b1ae8-66d8-4079-9d2f-6fc30c660007) — `generator: openai`, `/v1/coach/advise`, check-in `coachMessage`
- [Mobile AI Coach UI wire](13d84708-9c92-45d3-a3aa-9c651a12c453)

**Ops:** restart wrangler (picks `.dev.vars`); Expo reload Coach tab.

## 2026-10-31 — G3 AI Coach UI landed

**Done:** Coach UI wired (see above).

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

## 2026-10-31 — Integrate landed; tester in flight

**Done**
- [Integrate API purchases assets](d25fc8cc-2608-48b8-8c82-e40f2327e5cd): boot purchases, generate→plan store, Today/Fuel API, paywall stub, stitch images; mobile typecheck PASS

**Doing**
- [Tester smoke Mirra app](ffde98c0-4dea-47fd-8087-6ee3afbbb96f)

**Gaps (soft)**
- Live RC / Better Auth; some secondary mock chrome; visual QA vs Stitch

## 2026-10-31 — Build wave 1 complete → integrate

Wave 1 builders all done (assets/onb/tabs/api/rc).

## 2026-10-31 — GOAL kickoff (running app)

**Objective:** Stitch-faithful Mirra running + tested.

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
