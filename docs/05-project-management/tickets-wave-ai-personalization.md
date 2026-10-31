# Wave: AI personalization (tickets A-F)

Source of truth for builders. Linear mirrors these (team AMI, project [Mirra AI Personalization](https://linear.app/amitd1/project/mirra-ai-personalization-6eccdbd7aaa7)). Linear blocks: B blocked by F; D blocked by B and E. IDs are in the table below.

| Ticket | Linear | Title | Wave | Est |
| --- | --- | --- | --- | --- |
| F | [AMI-122](https://linear.app/amitd1/issue/AMI-122) | Architecture doc: onboarding profile snapshot to AI context port | 1 | 2h |
| A | [AMI-123](https://linear.app/amitd1/issue/AMI-123) | Week-reveal S12 Stitch parity + smoke screenshots | 1 | 4h |
| C | [AMI-124](https://linear.app/amitd1/issue/AMI-124) | Today week-strip presence dots + tap day to history | 1 | 4h |
| E | [AMI-125](https://linear.app/amitd1/issue/AMI-125) | AI credits schema + API + plan gating + referral stub + hard caps | 1 | 4h |
| B | [AMI-126](https://linear.app/amitd1/issue/AMI-126) | Persist + feed all onboarding prefs into workout + meal generation | 2 | 4h |
| D | [AMI-127](https://linear.app/amitd1/issue/AMI-127) | Meal detail sheet + Chef/recipe AI chat | 3 | 4h |

## Build order (file-collision safe)

1. **Wave 1, parallel, one worktree each:** F, A, C, E. Disjoint paths. F is docs only and defines the snapshot contract that B and D consume.
2. **Wave 2:** B. Starts after F is merged. Must not edit `week-reveal.tsx` or `WeekReveal*` (A owns them).
3. **Wave 3:** D. Starts after B (snapshot + meal services) and E (credit gate, `ai-quotas.ts`) are merged.
4. **Wave 4:** testers, one per surface (onboarding+week-reveal, Today strip, Fuel + Chef, credits/paywall). Testers chase UX beyond written AC.

Shared-file locks (never two agents at once): `apps/api/src/lib/ai-quotas.ts` and `services/ai-budget.ts` (E then D), `services/meal-plan*.ts` and `lib/meal-diet.ts` (B then D), `packages/contracts/src/index.ts` (append-only exports, rebase before merge).

## Common rules for every ticket

- **Builder, not lead.** You implement exactly this one ticket in your own worktree. You do not orchestrate, dispatch subagents, merge, or write "Pass". A separate tester signs off. Return at most 400 words: what changed, files, commands run, screenshot paths, open gaps.
- Worktree from `origin/main`, push with `git push -u origin HEAD`, report the branch URL. PM merges, then removes the worktree.
- Rules from `AGENTS.md`: Stitch is the UI source of truth (`stitch_mirra_ai_personal_trainer/`), no hex in UI (theme tokens), files at most 250 lines, Zod on inputs, ports + adapters for AI, no `any`.
- Expo styling is `StyleSheet` / `sx` + tokens. NativeWind is removed; do not add `className`.
- Every D1 read/write filters by `user_id` (see `docs/03-engineering/user-owned-plans-and-ai-context.md`).
- AI copy goes through `sanitizeAiCopy` (no em dashes, no bare semicolons).
- `npm run typecheck -w @mirra/mobile` and `-w @mirra/api` pass. Lint clean.
- UI tickets: smoke screenshots saved to `docs/05-project-management/smoke/<ticket>/` and linked in the PR/branch note. Use iOS Simulator with Expo Go 58 (`npx expo-go download ios 58`), 390x844 minimum, plus one small phone size (iPhone SE).
- After merge, PM updates `STATUS.md` and `handoff.md`. Builders do not edit those two files.

---

## F. Architecture doc: onboarding profile snapshot to AI context port

**Why:** Prefs are collected in 15 onboarding screens but each AI path reads a different subset (`run-plan-job.ts`, `meal-plan-draft.ts`, `personal-context.ts`, `coach-context.ts`). One snapshot and one port stops drift. B and D implement it.

**Deliverable:** `docs/03-engineering/ai-profile-snapshot.md` (at most 200 lines) plus a type-only contract PR in `packages/contracts/src/ai-profile.ts` (no behavior).

**Acceptance criteria**
1. Field inventory table: every onboarding answer (goal, experience, sex/gender, age, height, weight, goal weight, pace, equipment, train days, session minutes, diet tags, foods avoid, cuisine styles, trainer persona, physique target, lifestyle notes, units, timezone) with columns: onboarding screen, store key, wire field, D1 column, today read by which AI path (workout / meal / coach / revise / insights / chef). Gaps marked in bold.
2. Defines `AiProfileSnapshot` (Zod + inferred type): stable, versioned (`version: 1`), compact, no PII beyond what the prompt needs (no email, no user id in prompt text). Includes derived fields: `genderLabel`, `kcalTarget`, `proteinFloorG`, `hardFilters` (`cuisines`, `dietTags`, `avoid`), `softPrefs` (lifestyle, physique, persona).
3. Defines port `AiProfileContextPort` in `apps/api/src/ports/ai-profile-context.ts` (spec only, signature in doc): `getSnapshot(userId)`, `toPromptBlock(snapshot, purpose: "workout" | "meal" | "coach" | "chef")`, `hash(snapshot)` for cache keys. Adapter location: `apps/api/src/services/ai-profile-snapshot.ts` (B builds).
4. Layering diagram (mermaid): onboarding store -> `PUT /v1/onboarding` -> D1 (`profiles`, `preferences`) -> snapshot builder -> port -> each generator adapter (OpenAI + heuristic). Shows where hard filters are enforced (code, post-validation) versus prompt hints.
5. Hard-filter rules documented: cuisine/region and diet and avoid are code-enforced after generation (reject + regenerate once + heuristic fallback), never only a prompt hint. Gender is used for kcal/protein/volume defaults and tone, never to block a food or exercise.
6. Cache key rule: `${userId}:${feature}:${snapshot.hash}:${logicalKey}`; snapshot change invalidates meal/chef caches.
7. Migration plan: list columns B adds (`preferences.region` if needed, `profiles.gender` mapping from `sex`), default for legacy rows, backfill rule. Notes that mobile store defaults `sex: "male"` silently and B must change this.
8. Open questions listed (max 5) with a recommended answer each. Does not block B.
9. Links added from `docs/03-engineering/user-owned-plans-and-ai-context.md` and `docs/INDEX.md`.

**Path index**

| path | why |
| --- | --- |
| `docs/03-engineering/user-owned-plans-and-ai-context.md` | existing context layering |
| `docs/03-engineering/integrations.md` | ports + adapters pattern |
| `packages/contracts/src/onboarding.ts`, `preferences.ts`, `me.ts` | wire shapes |
| `apps/api/src/routes/onboarding.ts`, `routes/me.ts` | persistence |
| `apps/api/src/db/schema/profile.ts` | D1 columns |
| `apps/api/src/services/run-plan-job.ts`, `meal-plan-draft.ts`, `personal-context.ts`, `coach-context.ts` | current readers |
| `apps/mobile/src/features/onboarding/store.ts`, `map-body.ts`, `types.ts` | client answers |

**Definition of done:** doc + type-only contract merged, typecheck passes, tester reads it and confirms every onboarding screen appears in the inventory. No UI, so no screenshots. Builder returns branch URL; builder does not lead the wave or edit STATUS.

---

## A. Week-reveal S12 Stitch parity + smoke screenshots

**Why:** Week reveal is the hook screen (60s mirror to week). It must match `s12_week_reveal` exactly.

**Acceptance criteria**
1. Pixel pass against `stitch_mirra_ai_personal_trainer/s12_week_reveal/screen.png` and `code.html`: header, hero (title, goal chip, sub), 7-day strip (letters, active day, rest vs workout markers), workout cards (image, title, meta chips, order), CTA, safe areas, spacing, radii, type scale. Tokens from `kinetic_performance/DESIGN.md` only, no new colors.
2. Day strip: correct letters M..S, active day highlight, rest-day styling distinct, tap a day updates the selected card; no overflow at 320pt width.
3. Workout cards show real API data (title, exercise count, minutes, focus), with images from `assets/stitch`; fallback image if a workout has none. No layout shift while data loads (skeleton or fixed heights).
4. Loading, empty (plan failed), and error states exist and match Stitch tone. Copy comes from `src/content/onboarding.ts`; no AI-chat tone, no em dashes.
5. CTA goes to paywall step unchanged; back behavior unchanged; haptic and motion at most what Stitch implies (Moti, 200 to 300ms).
6. Accessibility: labels on strip days and cards, 44pt touch targets, Dynamic Type does not clip title.
7. Remove any leftover `className` in the touched files. Files at most 250 lines (split `WeekRevealParts.tsx` if needed).
8. Typecheck + lint clean. No behavior change to plan generation or persistence.

**Path index**

| path | why |
| --- | --- |
| `stitch_mirra_ai_personal_trainer/s12_week_reveal/{screen.png,code.html}` | UI source of truth |
| `stitch_mirra_ai_personal_trainer/kinetic_performance/DESIGN.md` | tokens |
| `apps/mobile/app/(onboarding)/week-reveal.tsx` | screen |
| `apps/mobile/src/features/onboarding/components/WeekRevealParts.tsx`, `WeekRevealHero.tsx`, `WeekRevealWorkoutCard.tsx` | parts |
| `apps/mobile/src/content/onboarding.ts` | copy |
| `apps/mobile/assets/stitch` | images |
| `apps/mobile/src/theme/tokens.ts`, `sx.ts` | tokens |
| `apps/mobile/src/ui/` | shared UI |

**Do not touch:** onboarding store, API, other onboarding screens (B owns persistence).

**Definition of done**
- Smoke screenshots in `docs/05-project-management/smoke/A-week-reveal/`: `stitch-reference.png`, `sim-390.png`, `sim-se.png`, `loading.png`, `empty-error.png`, `day-tap.png`. Side-by-side diff note listing any intentional deviation.
- Typecheck + lint pass. Branch pushed.
- Builder not lead: no self-certified Pass; tester verifies parity.

---

## C. Today week-strip presence dots + tap day to history

**Why:** Show accountability at a glance. A small dot marks days the user showed up; tapping a day opens that day's history.

**Definition:** "Presence" means the user opened the app and was signed in that local day (sign-in or foreground session). It is not workout completion. Workout/meal/check-in activity on a day also counts as presence.

**Acceptance criteria**
1. D1 table `user_presence_days (user_id, day TEXT 'YYYY-MM-DD' in user timezone, first_seen_at, last_seen_at, opens INTEGER)`, PK `(user_id, day)`. Migration `0008_*.sql` (E uses `0009`; builder rebases numbering if E merges first) plus Drizzle schema.
2. `POST /v1/presence/ping` (idempotent upsert, one per app foreground, throttled client-side to once per 30 min). Day computed from `profiles.timezone`. Zod contract in `packages/contracts/src/presence.ts`.
3. `GET /v1/presence?from=&to=` returns days with `present: boolean` and `signals: ("open"|"workout"|"meal"|"check_in")[]`, derived from presence table plus existing `workout_sessions`, `meals`, `check_ins`. Max range 62 days. User-scoped.
4. Mobile: `WeekStripCard` shows a small presence dot (6pt, `primary` token) under the day number when present. Distinct from the active-day highlight and from a workout marker. No dot for future days. Missed past days show nothing (no guilt styling).
5. Dots load with the plan week without blocking the strip (render strip first, dots fade in). Cache in `today-store`; works offline from last sync.
6. App foreground hook pings once, after auth is ready. Failure is silent and retried next foreground.
7. Tap a day: selects it (existing `onSelectDay`) and opens a day history sheet (`DayHistorySheet`) with: workout (planned vs done, sets), meals logged (kcal, protein), water, check-in, weight if logged, presence time. Empty day shows plain "Nothing logged." Uses `FormSheet`.
8. History data from a new `GET /v1/history/day?date=` that composes existing services (`history-summary.ts`, `plan-loaders.ts`); no new heavy queries (index on `(user_id, day)` only).
9. Accessibility: day button label like "Tuesday 28, you were here, 2 workouts logged".
10. Stitch `s15_today` layout is unchanged except the dot. Note any deviation.

**Path index**

| path | why |
| --- | --- |
| `apps/mobile/src/features/today/WeekStripCard.tsx` | strip + dot |
| `apps/mobile/src/features/today/TodayScreen.tsx`, `today-store.ts`, `use-today-insights.ts` | wiring |
| `apps/mobile/src/ui/FormSheet.tsx` | sheet base |
| `apps/mobile/src/lib/api/today.ts`, new `presence.ts`, `history.ts` | client |
| `apps/mobile/app/_layout.tsx` | foreground ping |
| `apps/api/src/routes/today.ts`, new `routes/presence.ts`, `routes/history.ts`, `app.ts` | routes |
| `apps/api/src/services/history-summary.ts`, `plan-loaders.ts` | data |
| `apps/api/src/db/schema/activity.ts` (or new `presence.ts`), `db/schema/index.ts`, `db/migrations/0008_*.sql` | schema |
| `packages/contracts/src/presence.ts`, `index.ts` | contracts |
| `stitch_mirra_ai_personal_trainer/s15_today/` | UI reference |

**Definition of done**
- Typecheck + lint pass; migration applies on a fresh local D1 and on a copy with data.
- Curl smoke: ping twice same day gives `opens` 2 and one row; user B cannot see user A's presence.
- Smoke screenshots in `docs/05-project-management/smoke/C-presence/`: `strip-dots.png` (mixed present/absent days), `strip-active-plus-dot.png`, `day-history-sheet.png`, `day-history-empty.png`, `sim-se.png`.
- Builder not lead; tester verifies. Branch pushed.

---

## E. AI credits schema + API + plan gating + referral top-up stub + hard monthly caps

**Why:** Today quotas are token and daily-call based (`ai-quotas.ts`). Product needs user-visible monthly credits, plan gating, referral top-ups, and a hard spend ceiling per user. Chef chat (D) and generation (B) depend on this gate.

**Acceptance criteria**
1. Migration `0009_ai_credits.sql` + Drizzle schema `db/schema/credits.ts`:
   - `ai_credit_ledger (id, user_id, period 'YYYY-MM', delta INT, reason 'monthly_grant'|'spend'|'referral'|'purchase'|'admin', feature, ref_id, created_at)` index `(user_id, period)`.
   - `ai_credit_periods (user_id, period, granted, bonus, spent, PK(user_id, period))` rollup for cheap PK lookups.
   - `referral_codes (user_id PK, code UNIQUE, created_at)`.
   - `referral_redemptions (id, referrer_user_id, referee_user_id UNIQUE, status 'pending'|'awarded'|'rejected', credits_awarded, created_at)`.
2. Credit costs in code (`lib/ai-credits.ts`): `revise 1, coach 1, meal_estimate 1, meal_plan 3, plan_gen 5, recipe_gen 2, chef_chat 1, voice_tts 1`. Extend `AiFeature` with `recipe_gen` and `chef_chat`. Heuristic (zero-cost) calls spend 0 credits.
3. Plan gating: free grant 40 credits/month, pro grant 400 (constants, one place, env-overridable). Tier from `getEntitlementTier`. Lazy monthly grant on first spend or read of the period (UTC month, idempotent via unique ledger row `monthly_grant:<period>`). Pro-only features declared in a map (e.g. voice cue beyond 3/day); gate returns `403 plan_required` with `upgrade: true`.
4. Hard caps, all enforced server-side in `assertCanSpend`, reuse and extend `services/ai-budget.ts`:
   - Monthly credits (grant + bonus) cannot go below 0: `429 ai_credits_exhausted`.
   - Absolute monthly ceiling: `ABS_MONTHLY_CREDITS` (free 60, pro 600) including referral bonus. Bonus alone capped at +20 per month.
   - Per-user monthly USD ceiling from `ai_usage_daily.estimated_micros` (free $0.50, pro $6, env-overridable). Exceeding it returns `429 ai_spend_cap` even if credits remain.
   - Existing daily call caps and token budget stay.
5. Spend is atomic with the usage log: check, call, then `recordUsage` writes event + rollup + ledger spend in one batch. Failed provider calls refund (no ledger spend).
6. API (contracts in `packages/contracts/src/credits.ts`):
   - `GET /v1/credits` -> `{ tier, period, granted, bonus, spent, remaining, absoluteCap, resetsAt, costs }`.
   - `GET /v1/credits/referral` -> `{ code, shareUrl, redeemedCount, bonusThisMonth, bonusCap }` (creates code lazily).
   - `POST /v1/credits/referral/redeem { code }` **stub**: validates code, blocks self-referral and second redemption, writes `pending`. Awards credits only when env `REFERRAL_TOPUP_ENABLED=true` and the referee has completed onboarding (checks `profiles.onboarding_completed_at`); default off. Award uses `reason 'referral'`, respects the +20 bonus cap, idempotent.
   - Keep `GET /v1/ai/usage` working (backwards compatible); add `credits` block.
7. Every AI route (`coach`, `plan revise`, `plans/generate`, `meal-plan/generate`, `meals/estimate`, `voice-cue`) goes through the single gate; no route bypasses it. List the call sites in the PR.
8. Mobile: You screen credits meter ("34 of 40 credits, resets Nov 1") using Stitch tokens, referral card with copy/share (stub copy "Invite a friend, get bonus credits" shown only when top-up enabled flag from API), and a shared `AiLimitSheet` shown on `429/403` that links to the paywall. No raw error codes in UI.
9. Tests/smoke script `apps/api/scripts/smoke-credits.mjs`: free user spends to 0 then gets 429; pro grant larger; spend-cap 429; referral self-redeem rejected; double redeem rejected; user isolation (A cannot read B's ledger); top-up off by default.
10. `docs/03-engineering/ai-cost-and-voice.md` updated with the credit table and caps. No live RevenueCat or payment changes.

**Path index**

| path | why |
| --- | --- |
| `apps/api/src/lib/ai-quotas.ts`, `ai-usage.ts`, `ai-pricing.ts` | existing quotas + cost |
| `apps/api/src/services/ai-budget.ts` | gate (`assertCanSpend`, `getEntitlementTier`) |
| `apps/api/src/routes/ai.ts`, `coach.ts`, `plans.ts`, `meal-plan.ts`, `fuel.ts`, `workout-edit.ts` | call sites |
| `apps/api/src/db/schema/ai-usage.ts`, `billing.ts`, `index.ts`, `db/migrations/` | schema |
| `apps/api/src/lib/errors.ts` | new error codes |
| new `lib/ai-credits.ts`, `services/credits.ts`, `routes/credits.ts`, `db/schema/credits.ts` | new code |
| `packages/contracts/src/credits.ts`, `index.ts` | contracts |
| `apps/mobile/src/lib/api/ai-usage.ts`, new `credits.ts` | client |
| `apps/mobile/src/features/you/YouScreen.tsx`, `you-settings.tsx` | meter + referral |
| `apps/mobile/src/ui/` (new `AiLimitSheet`) | limit UI |
| `apps/mobile/app/(onboarding)/paywall.tsx` | upgrade target |
| `docs/03-engineering/ai-cost-and-voice.md` | doc |

**Definition of done**
- Typecheck + lint pass; migration applies on fresh and populated local D1; `smoke-credits.mjs` green (output pasted in branch note).
- Smoke screenshots in `docs/05-project-management/smoke/E-credits/`: `you-credits-meter.png`, `you-referral-card.png`, `ai-limit-sheet.png` (free exhausted), `pro-state.png`, `sim-se.png`.
- Builder not lead; tester verifies caps cannot be exceeded by parallel requests. Branch pushed.

---

## B. Persist + feed all onboarding prefs into workout + meal generation

**Why:** The user answers 15 screens but generators ignore some answers (for example `sex` is not used by meal generation, mobile store defaults `sex: "male"` silently, cuisine is a soft match that lets "universal" foods dilute a region). Prefs must persist and drive every generation.

**Depends on:** F merged (snapshot contract).

**Acceptance criteria**
1. Audit table in the PR (from F's inventory): every onboarding field persisted to D1 on `PUT /v1/onboarding` and round-trips on `GET /v1/me` (and local SQLite). Fix any that are dropped (check goal, experience, equipment, train days, session minutes, diet, avoid, cuisine, persona, physique, lifestyle, units, sex, age, height, weight, goal weight, pace, timezone).
2. Gender: onboarding captures sex/gender explicitly (options per Stitch `s05_body_stats`, including a non-binary / prefer-not option mapped to neutral defaults). Remove the silent `male` default: user must pick, or the default is `unspecified`. Stored in `profiles.sex` (map documented). Used in: kcal/protein defaults, workout volume and exercise selection defaults (no male-only programming), meal portions, coach and revise prompts, Chef prompts. Never used to hide foods or exercises.
3. Implement `AiProfileSnapshot` builder (`services/ai-profile-snapshot.ts`) per F: single function used by workout generation (`run-plan-job.ts`), meal generation (`meal-plan-draft.ts`), coach/revise/insights (`personal-context.ts`, `coach-context.ts`). No path reads prefs tables directly anymore.
4. Cuisine/region **hard filter** for meals: output meals must come only from foods whose cuisines intersect the user's picks. `universal` staples (eggs, rice, oats, etc.) allowed but capped at 40% of items per day and never as the named main of a meal. `other` means no filter. If the catalog cannot fill a day, widen to nearest region and return `filterRelaxed: true` plus a visible note; never silently ignore the filter.
5. OpenAI meal generator: prompt carries hard constraints; **post-validation in code** rejects any item violating diet tags, avoid list or cuisine, regenerates once, then falls back to the heuristic generator. Violations never reach the client.
6. Workout generator receives equipment, days, session minutes, experience, goal, sex, physique target, lifestyle notes; post-validate that every exercise needs only the listed equipment and the plan matches train-day count and minutes (+/-10%).
7. Changing prefs later (`PATCH /v1/me/preferences`, You screen, `DietPrefsSheet`) updates the same fields and invalidates meal and plan caches via snapshot hash.
8. Region: if the cuisine step has no region granularity needed, document that cuisine styles are the region key; if F decides a `region` field is required, add `preferences.region` (migration `0010_*`, nullable, backfill from cuisine).
9. Smoke script `apps/api/scripts/smoke-personalization.mjs` with 4 personas (female vegetarian South Asian, male keto Mexican, non-binary home-gym, `other` cuisine): assert zero cuisine/diet/avoid violations across 3 generated days, equipment respected, kcal differs by sex per documented rule, snapshot hash changes on pref edit.
10. Mobile UI changes only in onboarding body-stats/cuisine/diet screens and `YouScreen`; none to `week-reveal*` (A owns).

**Path index**

| path | why |
| --- | --- |
| `docs/03-engineering/ai-profile-snapshot.md` (from F) | contract |
| `apps/api/src/routes/onboarding.ts`, `routes/me.ts`, `lib/prefs-out.ts` | persistence |
| `apps/api/src/db/schema/profile.ts`, `db/migrations/` | schema |
| `apps/api/src/services/run-plan-job.ts`, `adapters/heuristic-plan-generator.ts`, `openai-plan-generator.ts` | workout gen |
| `apps/api/src/services/meal-plan-draft.ts`, `meal-plan.ts`, `lib/meal-diet.ts`, `data/vetted-foods.ts`, `adapters/heuristic-meal-plan-generator.ts`, `openai-meal-plan-generator.ts` | meal gen + filter |
| `apps/api/src/services/personal-context.ts`, `coach-context.ts`, `prefs-revise.ts`, `plan-revise.ts` | other readers |
| `packages/contracts/src/onboarding.ts`, `preferences.ts`, `me.ts` | wire |
| `apps/mobile/src/features/onboarding/store.ts`, `map-body.ts`, `types.ts` | client |
| `apps/mobile/app/(onboarding)/body-stats.tsx`, `cuisine.tsx`, `diet.tsx` | screens |
| `apps/mobile/src/content/onboarding.ts`, `cuisines.ts` | copy + options |
| `apps/mobile/src/features/fuel/DietPrefsSheet.tsx`, `diet-prefs.ts`, `features/you/YouScreen.tsx` | edit later |
| `stitch_mirra_ai_personal_trainer/s05_body_stats`, `s09_diet_prefs` | UI reference |

**Definition of done**
- Typecheck + lint pass; migrations apply fresh and populated; `smoke-personalization.mjs` green (paste output).
- Smoke screenshots in `docs/05-project-management/smoke/B-prefs/`: `body-stats-gender.png`, `cuisine-pick.png`, `fuel-meal-plan-per-persona.png` (2 personas), `you-prefs-edit.png`, `relaxed-note.png`.
- Builder not lead; tester runs the 4 personas on device. Branch pushed.

---

## D. Meal plan detail sheet + Chef/recipe AI chat

**Why:** Planned meals are a name and macros. Users need a detail view, an AI recipe for the planned meal, and a guarded chat to adapt it.

**Depends on:** B (snapshot, meal services) and E (credit gate, `recipe_gen`, `chef_chat`).

**Acceptance criteria**
1. Each planned meal row in `MealPlanCard` / `MealPlanSection` gets a "Chef" button (icon + label, 44pt) and tap-row opens `MealDetailSheet` (Stitch tokens; base `FormSheet`).
2. Sheet shows: meal name, slot, kcal/protein/carbs/fat, ingredients and portions (from the planned item), prep time, user's diet/cuisine tags as chips, existing manual edit/delete (no regressions to `PATCH/DELETE /v1/meal-plan/items`).
3. `POST /v1/meal-plan/items/:id/recipe` generates a recipe **from the planned meal** (not a different dish): steps, prep/cook time, ingredients matching the planned portions and macros within +/-10%, using `AiProfileSnapshot` hard filters (diet, avoid, cuisine, equipment for cooking where known). Credit cost `recipe_gen` (2). Cached per `(itemId, snapshot.hash, itemUpdatedAt)`; cached read costs 0. Heuristic fallback offline returns a template recipe built from ingredients.
4. Recipe is persisted (`meal_recipes` table: `item_id`, `user_id`, `json`, `snapshot_hash`, `created_at`) and shown instantly on reopen. Migration `0011_*` (rebase numbering).
5. Chef chat in the sheet (`ChefChat`): `POST /v1/meal-plan/items/:id/chef-chat { message }` with the last 6 turns, 1 credit per user message (`chef_chat`). Port `ChefChatPort` + OpenAI and heuristic adapters (ports + adapters; no direct OpenAI from routes/UI).
6. **Guardrails (all server-side, covered by tests):**
   - Scope: this meal, recipe, cooking technique, substitutions, portion scaling, prep/storage. Off-topic (politics, code, other products, workouts programming) gets a short redirect, no credit spent.
   - Safety: no medical advice, no diagnosis, no extreme diet or kcal below a floor (1200 female/1500 male default, neutral 1350); allergies are treated as hard: never suggest an avoided ingredient; say to check labels, not "safe".
   - Hard filters: substitutions must pass diet/avoid/cuisine validators from B; a violating reply is replaced by a safe fallback.
   - Prompt-injection: user text is data, system prompt not revealable, tool/URL requests refused. Max message 500 chars, max 6 turns of history, max 400 tokens reply.
   - Style: `sanitizeAiCopy`, plain short sentences.
   - Applying a suggested substitution is explicit (button "Apply to plan"), updates the planned item via existing PATCH, and recomputes macros with `meal-macros.ts`. Chat never silently edits the plan.
   - Credit exhausted/cap: `AiLimitSheet` (from E), chat history stays readable.
7. Chat persistence: last session per meal stored (`meal_chef_messages`, max 30 rows/meal, user-scoped) and cleared on item delete.
8. States: loading recipe (skeleton), streaming not required, error with retry, offline message, empty chat with 3 suggestion chips ("Make it faster", "Swap an ingredient", "Scale for 2").
9. Stitch reference: use `s18_fuel` and `s19_log_meal` styling and `plan-chat` patterns (`PlanChatScreen.tsx`); note deviations. No new colors.
10. Smoke script `apps/api/scripts/smoke-chef.mjs`: recipe matches planned meal macros; off-topic costs 0; avoided-ingredient swap request refused; injection attempt refused; user B cannot read user A's recipe or chat; credits decrement correctly.
11. Docs: `docs/03-engineering/plan-chat.md` or new `chef-chat.md` (at most 80 lines) with guardrail list.

**Path index**

| path | why |
| --- | --- |
| `apps/mobile/src/features/fuel/MealPlanCard.tsx`, `MealPlanSection.tsx`, `meal-plan-store.ts`, `MealEditor.tsx`, `meal-edit.ts` | entry points |
| `apps/mobile/src/ui/FormSheet.tsx`, `AiLimitSheet` (from E) | sheet base |
| `apps/mobile/src/features/coach/PlanChatScreen.tsx`, `plan-chat-store.ts` | chat pattern |
| `apps/mobile/src/lib/api/meal-plan.ts` | client |
| new `apps/mobile/src/features/fuel/MealDetailSheet.tsx`, `ChefChat.tsx`, `chef-store.ts` | UI (each at most 250 lines) |
| `apps/api/src/routes/meal-plan.ts`, new `routes/chef.ts` | routes |
| `apps/api/src/services/meal-plan-items.ts`, `meal-plan-store.ts`, `lib/meal-macros.ts`, `lib/meal-diet.ts` | domain |
| new `ports/chef-chat.ts`, `ports/recipe-generator.ts`, adapters `openai-*`, `heuristic-*` | ports + adapters |
| `apps/api/src/services/coach-guard.ts`, `lib/ai-copy.ts`, `services/ai-budget.ts` | reuse guard, copy, credits |
| `apps/api/src/db/schema/meal-plans.ts`, `db/migrations/` | `meal_recipes`, `meal_chef_messages` |
| `packages/contracts/src/meal-plan.ts`, new `chef.ts` | contracts |
| `docs/03-engineering/ai-profile-snapshot.md`, `plan-chat.md`, `meal-plans.md` | docs |
| `stitch_mirra_ai_personal_trainer/s18_fuel`, `s19_log_meal` | UI reference |

**Definition of done**
- Typecheck + lint pass; migration applies; `smoke-chef.mjs` green (paste output).
- Smoke screenshots in `docs/05-project-management/smoke/D-chef/`: `plan-row-chef-button.png`, `meal-detail-sheet.png`, `recipe-loading.png`, `recipe-ready.png`, `chat-empty-chips.png`, `chat-substitution-apply.png`, `chat-off-topic-redirect.png`, `credit-exhausted-sheet.png`, `sim-se.png`.
- Builder not lead; tester attempts guardrail bypasses (injection, allergen, medical, kcal floor). Branch pushed.

---

# Wave 2 addendum: context envelope + credits (tickets CX1-CX7)

Design: `docs/03-engineering/ai-context-and-credits-architecture.md` (read sections named per ticket only). Naming: the doc's `PersonalizationContextPort` / `ContextEnvelope` supersedes the `AiProfileContextPort` / `AiProfileSnapshot` names in ticket F. If F already merged, rename in CX2 and keep one port. Migration numbers: API `0008`, then `0009` for follow-ups. Lock files: `ai-quotas.ts`, `ai-budget.ts` (CX3 then CX5), `meal-plan*.ts`, `meal-diet.ts` (CX2 then CX4), `plan-input.ts` (CX2).

| Ticket | Title | Depends on | Est |
| --- | --- | --- | --- |
| CX1 | Mobile SQLite + contracts: stop dropping cuisine, physique, lifestyle (P0) | none | 3h |
| CX2 | `PersonalizationContextPort` + envelope + single prefs reader (P0 rebuild drop) | none | 5h |
| CX3 | Credits ledger + reservations + `GET /v1/credits` + shadow mode | none | 6h |
| CX4 | `RecipeSafetyPolicy` + equipment enforcement + "other" cuisine pin (P0s) | CX2 | 5h |
| CX5 | Credits enforce (reserve/settle) on coach, meal_plan, plan_gen, estimate, voice | CX3 | 4h |
| CX6 | `POST /v1/recipe/chat` + threads + turn caps + RecipeChatPort | CX2, CX4, CX5 | 6h |
| CX7 | Attendance day + ping + week strip read + physiology/gender split | CX3 (migration only) | 5h |

Waves: 1 = CX1, CX2, CX3 in parallel. 2 = CX4, CX5, CX7. 3 = CX6. Then testers per surface. Builders return at most 400 words, push branch, no merge.

## CX1. Mobile SQLite + contracts keep all onboarding prefs (P0)

**Why:** local `preferences` table (`apps/mobile/src/db/migrations/sql-001.ts`) has no cuisine, physique or lifestyle column. `LocalProfile.preferences` type omits them, so offline-first onboarding silently loses cuisine and rebuild/meal paths regress.
**Do:** new local migration `sql-00N` adding `cuisine_json`, `physique_target`, `lifestyle_notes` (defaults `'[]'`, null, null). Update `repositories/profile.ts` upsert/read, `types.ts` `LocalProfile`, `reassign-user.ts`, onboarding sync body (`map-body.ts`). Include `cuisineOther` text in `lifestyle_notes` or a dedicated column per existing `map-body.ts` rule.
**AC:** onboard with cuisines `["italian","other"]` + other text, kill app, relaunch: values present in `getLocalProfile()` and in `PUT /v1/onboarding` body. Existing installs migrate without data loss. Unit test on repo round trip. Typecheck mobile.
**Paths:** `apps/mobile/src/db/**`, `apps/mobile/src/features/onboarding/map-body.ts`, `packages/contracts/src/onboarding.ts`. Doc: §0, §F step 2.

## CX2. PersonalizationContextPort + envelope + single prefs reader (P0 rebuild drop)

**Why:** `rebuild-plan.ts`, `run-plan-job.ts`, `meal-plan-draft.ts`, `coach-context.ts` each read `preferences` differently. One new column silently drops in rebuild.
**Do:** `packages/contracts/src/ai-context.ts` (Zod from doc §A, append-only export), `apps/api/src/ports/personalization-context.ts`, `services/personalization-context.ts` (D1 adapter), `parsePreferencesRow()` helper, factory `getPersonalizationContext`. Rewrite `plan-input.ts` builders to read the envelope. Per-feature field budgets from §A table. `contextHash` sha256 of selected record ids + schema version.
**AC:** schema rejects non-`user_setting` hard constraints; golden test: envelope-derived `prefsJson` equals old output for fixture users; rebuild preview input contains cuisine, equipment, lifestyle, physique, persona; no `gender_identity`/raw history in non-coach envelopes (snapshot test); logs show hash not body.
**Paths:** `apps/api/src/services/{plan-input,rebuild-plan,run-plan-job,meal-plan-draft,coach-context}.ts`, `ports/index.ts`. Doc: §A, §F step 4.

## CX3. Credits ledger + reservations + GET /v1/credits (shadow mode)

**Why:** user-facing monthly tokens are opaque and `canSpend` is check-then-record (races, streams bypass).
**Do:** migration `0008` for `ai_credit_ledger`, `ai_credit_reservations`, `ai_credit_balance` (+ Drizzle `db/schema/ai-credits.ts`); `lib/ai-credits.ts` pricing + grants (free 30 / pro 300 per month, config-driven); `services/ai-credits.ts` reserve/settle/release with `D1 batch`; `AiReserveDO` per-user Durable Object (wrangler binding) to serialize reserves; cron releases expired holds; `GET /v1/credits` (balances, per-feature remaining, resetAt, costs, warnings at 80%/0); alias `/v1/ai/usage`. `AI_CREDITS_MODE=off|shadow|enforce`, default `shadow` (writes ledger, never blocks).
**AC:** reserve+settle nets the action price; provider failure restores balance; same `clientRequestId` yields one reservation; expired open hold released; concurrent double reserve beyond concurrency cap rejected; lazy monthly grant idempotent via `idempotency_key`; `user_id` scoping tests. Existing `ai_usage_events/daily` untouched.
**Paths:** `apps/api/src/db/schema/`, `services/ai-budget.ts` (read only except exports), `routes/ai.ts`, `wrangler.jsonc`. Doc: §B, §E.

## CX4. RecipeSafetyPolicy + equipment enforcement + "other" pin (P0s)

**Why:** heuristic plan generator declares `equipment` but never reads it; "other" cuisine bypass was fixed once and needs a regression pin; the OpenAI path has no post-validation.
**Do:** `services/recipe-safety-policy.ts` (allergen/diet/avoid tags, `cuisine_only`, grams 5-1000, macro tolerance +/-15%, catalog id exists) reused by meal generator, revise, and chat. Equipment filter on `TEMPLATES` in `heuristic-plan-generator.ts`; post-validate OpenAI plans against `equipment`/`excluded_movement` (reject, regenerate once, heuristic fallback). Pin `effectiveCuisines` behaviour with tests.
**AC:** equipment `["bodyweight"]` yields zero barbell/machine moves in both adapters (mocked OpenAI returning "Barbell squat" is rejected); cuisines `["other"]` and no hints never returns the full catalog; nuts allergy rejects nut-tagged output with one repair then fallback; policy is a pure function with table tests.
**Paths:** `apps/api/src/adapters/heuristic-plan-generator.ts`, `openai-plan-generator.ts`, `lib/meal-cuisine.ts`, `lib/meal-diet.ts`. Doc: §0, §C step 9.

## CX5. Credits enforce on existing AI features

**Why:** switch from check-then-record to reserve/settle once shadow data looks sane.
**Do:** wrap `coach/advise`, `coach/revise`, meal plan generate/swap, `plan_gen` job, `meal_estimate`, voice cue with `reserve` -> adapter -> `settle`/`release`. Heuristic adapters never reserve. `402 OUT_OF_CREDITS` envelope `{ error: { code, message, retryable, resetAt } }`; mobile maps it to the existing paywall/upsell with manual fallbacks intact. Flip default to `enforce` via env only after a week of shadow comparison noted in the PR.
**AC:** balance 0 returns 402 with provider mock called 0 times and heuristic/manual routes still 200; 80% warning in `/v1/credits`; no regression in existing smoke scripts; typecheck both workspaces.
**Paths:** `routes/{coach,meal-plan,plans,fuel,ai}.ts`, `services/ai-budget.ts`, mobile `lib/api/`. Doc: §E.

## CX6. POST /v1/recipe/chat + threads + turn caps

**Why:** Chef chat (ticket D) needs bounded, intent-based chat, not open-ended prompts.
**Do:** migration `0009` (`recipe_chat_threads`, `recipe_chat_turns`); `RecipeChatPort` (OpenAI + heuristic adapters, JSON `RecipeIntent`: swap/exclude/resize/explain/regenerate_slot, catalog ids + grams only); route pipeline exactly per doc §C (404 ownership, 409 `THREAD_CAPPED` at 8, pre-LLM constraint check 422, reserve, call with max 500 output tokens / 3 tool rounds / 45 s abort, post-validate via CX4 policy, apply via `meal-plan-items.ts`, settle, summary every 4 turns). Mobile UI belongs to ticket D, not here.
**AC:** G8-G12 in doc §G pass as vitest; macros recomputed from catalog (never model); peanut request under nut allergy 422 with mock uncalled; user B gets 404 on A's `mealId`/`threadId`; logs contain `contextHash` and usage id only.
**Paths:** `routes/meal-plan.ts` (or new `routes/recipe-chat.ts`), `services/meal-plan-items.ts`, `ports/recipe-chat.ts`, `adapters/*recipe-chat*.ts`. Doc: §B, §C, §E.

## CX7. Attendance day + ping + physiology/gender split

**Why:** Today week-strip dots (ticket C) need a server source; sex/gender are currently one `profiles.sex` column defaulted silently to male on mobile.
**Do:** `attendance_day` table + `POST /v1/attendance/ping` (idempotent, server derives local date from profile timezone) + `GET /v1/attendance/week`; set flags from session end, meal log, check-in services. `physiology_profile` (`sex_for_equations`, `life_stage`, `consented_at`), `profiles.gender_identity`, `preferences.imagery_preference`; backfill `sex_for_equations` only from `female`/`male`. Onboarding copy "Used for calorie estimates only" with Prefer not to say; null switches to neutral equation or manual target. Imagery resolver: `imagery_preference` -> consented `sex_for_equations` -> neutral; gender identity alone never selects assets; assets keyed `neutral|variant_a|variant_b`.
**AC:** G13, G14 pass; two pings one row; midnight edge uses profile timezone; pregnant life stage disables equation and shows manual-target notice; mobile no longer defaults sex to male; Today strip dot states none/open/active match API (screenshot 390 px vs Stitch).
**Paths:** `db/schema/profile.ts`, `services/{meals,workout-edit,check-ins}*.ts`, mobile `features/onboarding/store.ts`. Doc: §B (attendance), §D.
