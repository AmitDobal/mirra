# AI context + credits architecture (design sketch)

**Status:** proposal, no runtime code. Source of truth for patterns: `ai-personalization-research.md`.
Builds on: `integrations.md` (ports), `d1-schema.md`, `user-owned-plans-and-ai-context.md`, `services/ai-budget.ts`, `lib/ai-quotas.ts`.
Next migration number: `0008` (last is `0007_physique_lifestyle.sql`).

## 0. Audit P0s this design must close

| P0 | Where it shows | Closed by |
| --- | --- | --- |
| Meal diet "other" cuisine bypass | `lib/meal-cuisine.ts` / `meal-diet.ts` (`effectiveCuisines`). API fix exists; mobile smoke seeds only `["other"]`. | §A hard constraints are computed once in the context service and re-validated before and after the LLM (§C). Test G3. |
| Rebuild drops prefs | `rebuild-plan.ts` passes `buildPlanPrefsJson`, but only a subset of columns. Any new column must be added in one place. | §A: `PersonalizationContextPort` is the only builder of generator input. `buildPlanPrefsJson` becomes a thin wrapper over it. Test G4. |
| Mobile SQLite drops cuisine | `apps/mobile/src/db` local `preferences` has `diet_tags_json` but no cuisine column. `LocalProfile.preferences` has no `cuisineStyles`. | §F step 2: local migration `sql-00N` adds `cuisine_json`, `physique_target`, `lifestyle_notes`. `LocalProfile` + `OnboardingInput` round-trip. Test G5. |
| Heuristic ignores equipment | `heuristic-plan-generator.ts` declares `equipment` in `Prefs` but never reads it. | §A `hardConstraints[type=equipment]`. Heuristic and OpenAI generators both filter `TEMPLATES` by it. Post-validate (§C). Test G6. |

Root cause for all four: **many hand-rolled readers of `preferences`**. Fix is one reader (the port) plus one validator.

---

## A) `PersonalizationContextPort` + `ContextEnvelope`

Lives in `apps/api/src/ports/personalization-context.ts` (port) and `packages/contracts/src/ai-context.ts` (Zod, shared with mobile for debug screens only).

```ts
import { z } from "zod";

export const AiContextFeatureSchema = z.enum(["coach", "workout_plan", "meal_plan", "recipe_chat"]);
export type AiContextFeature = z.infer<typeof AiContextFeatureSchema>;

export const HardConstraintSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("allergy"), value: z.string().max(40), source: z.literal("user_setting") }),
  z.object({ type: z.literal("diet"), value: z.string().max(40), source: z.literal("user_setting") }),   // vegan, halal...
  z.object({ type: z.literal("avoid_food"), value: z.string().max(60), source: z.literal("user_setting") }),
  z.object({ type: z.literal("cuisine_only"), value: z.string().max(40), source: z.literal("user_setting") }),
  z.object({ type: z.literal("equipment"), value: z.string().max(40), source: z.literal("user_setting") }),
  z.object({ type: z.literal("excluded_movement"), value: z.string().max(60), source: z.literal("user_setting") }),
  z.object({ type: z.literal("injury"), value: z.string().max(60), source: z.literal("user_setting") }),
]);
// Hard constraints may ONLY come from explicit settings. Never from notes, behavior or the LLM.

export const ContextEnvelopeSchema = z.object({
  schemaVersion: z.literal(1),
  feature: AiContextFeatureSchema,
  profile: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.string())])),
  hardConstraints: z.array(HardConstraintSchema).max(40),
  currentState: z.record(z.string(), z.union([z.number(), z.string(), z.boolean(), z.null()])),
  relevantMemories: z
    .array(z.object({
      text: z.string().max(200),
      source: z.enum(["user_setting", "user_message", "behavior", "health_sync"]),
      confidence: z.number().min(0).max(1),
    }))
    .max(8),
  generatedAt: z.string().datetime(),
  /** sha256 of sorted selected-record ids + schemaVersion. Logged instead of prompt bodies. */
  contextHash: z.string().length(64),
});
export type ContextEnvelope = z.infer<typeof ContextEnvelopeSchema>;

export type PersonalizationContextPort = {
  build: (input: {
    userId: string;
    feature: AiContextFeature;
    /** recipe_chat: plan item being discussed. workout_plan: week start. */
    subjectId?: string;
    /** Today in the user's timezone, YYYY-MM-DD. */
    localDate: string;
  }) => Promise<ContextEnvelope>;
};
```

### Per-feature field budget (what each feature may see)

| Feature | `profile` | `hardConstraints` | `currentState` | `relevantMemories` |
| --- | --- | --- | --- | --- |
| `workout_plan` | goal, experience, days, sessionMinutes, physiqueTarget, `physiology.sexForEquations` only if the plan calls an equation | equipment, excluded_movement, injury | prior week completion %, last-4-week avg RPE | ≤4 |
| `meal_plan` | goal, units, kcal/macro targets, cuisines, prep time | allergy, diet, avoid_food, cuisine_only | remaining macros, foods used last 3 days | ≤4 |
| `recipe_chat` | targets, cuisines | same as meal_plan | the one plan item (title, items, macros, slot) + remaining macros | ≤4 |
| `coach` | tenure, persona, goal | allergy, injury | today fuel, training, weight trend, streak | ≤6 |

Rules: no raw chat, no raw history (use existing `historySummary`), no `gender_identity` in any envelope except `coach` copy tone hints (display only, see §D). Free text (`lifestyleNotes`, memories) is wrapped as data: `<user_notes>…</user_notes>` and the system prompt states it is not instructions.

Implementation: `services/personalization-context.ts` composes existing `personal-context.ts`, `meal-diet.ts` `filterCatalog` inputs and `plan-input.ts`. `buildPlanPrefsJson` and `buildPlanProfileJson` are rewritten to read from the envelope. A single `parsePreferencesRow(row)` helper owns JSON column parsing so adding a column touches one file.

Factory: `getPersonalizationContext(env, db)`. Only adapter is `d1` (no vendor), but the port keeps tests and mobile stubs simple.

---

## B) D1 tables (migration `0008_ai_credits_context.sql`, Drizzle in `db/schema/ai-credits.ts`, `attendance.ts`, `recipe-chat.ts`)

All `user_id` FKs `references users(id) on delete cascade`. Times are `timestamp_ms` like the rest of the schema.

### `ai_credit_ledger` (append-only; balance = sum)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text pk | ulid |
| `user_id` | text not null | |
| `bucket` | text not null | `monthly` \| `purchased` \| `referral` \| `promo` |
| `delta` | integer not null | credits, +grant / −spend. Never 0. |
| `kind` | text not null | `grant` \| `reserve` \| `settle` \| `release` \| `refund` \| `expire` \| `referral_award` \| `adjust` |
| `feature` | text | `coach` \| `recipe_chat` \| `meal_plan` \| `plan_gen` \| `meal_estimate` \| `voice_tts` |
| `reservation_id` | text | links reserve/settle/release rows |
| `usage_event_id` | text | → `ai_usage_events.id` (tokens + `estimated_micros` stay there) |
| `period` | text | `YYYY-MM` for `monthly` bucket |
| `expires_at` | integer | purchased/referral/promo only; monthly expires at period end |
| `idempotency_key` | text | unique per user (webhook event id, referral id, reservation id + kind) |
| `created_at` | integer | |

Indexes: `(user_id, created_at)`, `(user_id, bucket, expires_at)`, unique `(user_id, idempotency_key)`.
Spend order: monthly → referral/promo (soonest expiry) → purchased.
Balance query: `sum(delta) where user_id=? and bucket=? and (expires_at is null or expires_at>now)`. Cache the rollup in `ai_credit_balance(user_id, bucket, balance, updated_at)` updated in the same batch as the ledger insert (D1 `batch` is atomic).

### `ai_credit_reservations` (short-lived holds)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text pk | |
| `user_id` | text not null | |
| `feature` | text not null | |
| `credits_reserved` | integer not null | max charge for the action |
| `credits_settled` | integer | null until settled |
| `status` | text not null | `open` \| `settled` \| `released` \| `expired` |
| `max_output_tokens` | integer not null | echoes the cap sent to the provider |
| `thread_id` | text | recipe_chat only |
| `request_hash` | text | sha256(userId + feature + clientRequestId) for replay safety |
| `created_at`, `expires_at` | integer | `expires_at` = created + 120 s |
| `settled_at` | integer | |

Indexes: `(user_id, status)`, unique `(user_id, request_hash)`. A cron (existing Cron Trigger) releases `open` rows past `expires_at` and appends `release` ledger rows. Concurrency (max live streams: free 1, pro 2) is `count(status='open')`, serialized by the per-user Durable Object `AiReserveDO` (research §5). D1 is the durable truth; the DO only orders reserve calls.

### Action pricing (config, not schema): `lib/ai-credits.ts`

| Feature | Credits | Max output tokens |
| --- | ---: | ---: |
| `recipe_chat` reply | 1 | 500 |
| `coach` reply | 1 | 400 |
| `meal_estimate` photo | 2 | 300 |
| `plan_gen` (week) | 10 | 3000 |
| `meal_plan` (day) | 3 | 1500 |
| `voice_tts` cue | 1 | n/a (chars) |

Monthly grants (hypothesis, tune from `estimated_micros`): free 30, pro 300. Replaces user-facing `monthlyTokens`; `ai_usage_daily` stays for per-feature daily caps and the global cost kill switch.

### `attendance_day` (Today week-strip dots)

One row per user per local day, written by a ping and by existing writes (session end, meal log, check-in). It is a derived cache, not a source of truth for streaks.

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | text | pk part |
| `local_date` | text | `YYYY-MM-DD` in profile timezone, pk part |
| `opened_app` | integer bool default 0 | from ping |
| `workout_done` | integer bool default 0 | set on `workout_sessions` end |
| `meal_logged` | integer bool default 0 | set on `meals` insert |
| `checked_in` | integer bool default 0 | |
| `first_seen_at`, `last_seen_at` | integer | |

PK `(user_id, local_date)`. Dot state for the strip: `none` → no row; `open` → `opened_app` only; `active` → any of the other flags. The client never sets the date. The server derives `local_date` from the user's timezone.

### `recipe_chat_threads` (+ `recipe_chat_turns`)

`recipe_chat_threads`: `id`, `user_id`, `plan_item_id` (→ `meal_plan_items.id`, set null on delete), `plan_day_id`, `status` (`open` \| `closed` \| `capped`), `turn_count`, `max_turns` (default 8), `summary` (≤1000 chars, structured text), `summary_through_turn`, `context_hash`, `created_at`, `updated_at`. Unique `(user_id, plan_item_id)` where `status='open'`.

`recipe_chat_turns`: `id`, `thread_id`, `idx`, `role` (`user` \| `assistant`), `text` (≤500 chars user, ≤1200 assistant), `intent_json` (validated `RecipeIntent`), `usage_event_id`, `created_at`. Unique `(thread_id, idx)`. Retention: delete turns older than 30 days; keep thread summary.

### Related additions (small, same migration or `0009`)

- `physiology_profile(user_id pk, sex_for_equations text null check in ('female','male'), life_stage text null check in ('none','pregnant','lactating'), consented_at, updated_at)`. See §D.
- `user_memory_notes` and `context_snapshot_audit` per research §6 can ship in a later wave. The envelope already has `relevantMemories` (empty until then).

---

## C) API routes (Hono, all `requireAuth`, Zod-validated)

| Route | Purpose |
| --- | --- |
| `POST /v1/recipe/chat` | Body `{ mealId, message, clientRequestId, threadId? }`. `mealId` is `meal_plan_items.id`. |
| `GET /v1/credits` | Balance by bucket, per-feature remaining, next reset, tier, `costs` table. Supersedes `GET /v1/ai/usage` (keep the old route as alias for one release). |
| `POST /v1/attendance/ping` | Body `{ source: "app_open" }`. Idempotent upsert for today. Returns the last 7 `attendance_day` rows for the strip. |
| `GET /v1/attendance/week?start=YYYY-MM-DD` | Optional read for the strip. |

### `POST /v1/recipe/chat` pipeline (order matters)

```
1  auth + zod parse (message ≤ 500 chars)
2  load meal_plan_items by mealId AND user_id  → 404 otherwise
3  load or create thread; if turn_count ≥ max_turns → 409 { code: "THREAD_CAPPED" } (no LLM, no charge)
4  envelope = PersonalizationContextPort.build({ feature: "recipe_chat", subjectId: mealId })
5  PRE-LLM validation (deterministic, no tokens):
     - message length / empty / injection-shaped patterns (log only, do not trust)
     - "hard constraint requested away" check, e.g. "add peanuts" with allergy=nuts → 422 { code: "CONSTRAINT_VIOLATION", constraint } and a canned reply. No LLM call, no charge.
6  reserve credits (§E). zero balance or cap → 402 { code: "OUT_OF_CREDITS", resetAt, manualFallback: true }
7  provider call via RecipeChatPort (new port, OpenAI adapter + heuristic adapter) with max_output_tokens, 45 s abort, ≤3 tool rounds
8  model returns RecipeIntent: swap | exclude | resize | explain | regenerate_slot  (ingredient ids from catalog + grams; never macros)
9  POST-LLM validation: RecipeSafetyPolicy (allergen/diet/avoid tags, cuisine_only, grams bounds 5–1000, kcal/macro tolerance ±15% of slot target, catalog ids exist). On fail: one repair attempt inside the same reservation, else release 100% and return 422 { code: "UNSAFE_OUTPUT" } with heuristic fallback.
10 domain service applies the mutation (`meal-plan-items.ts`), recomputes macros from catalog
11 settle reservation from actual tokens; append turn rows; increment turn_count; update summary every 4 turns
12 respond { reply, intent, item, thread: { id, turnsLeft }, credits: { remaining, charged } }
```

Hard-constraint validation lives in `services/recipe-safety-policy.ts` and is reused by the meal plan generator and plan revise, so every path shares one implementation (closes the "other" bypass). `cuisine_only` with `"other"` never widens the catalog: it adds only `other`-tagged foods plus hinted cuisines (existing `effectiveCuisines` behaviour, pinned by a test).

Streaming (v2): same pipeline, reserve before opening, settle in `waitUntil` on completion or disconnect. Partial text is never persisted.

Error envelope (shared): `{ error: { code, message, retryable, resetAt? } }`. Codes: `OUT_OF_CREDITS`, `THREAD_CAPPED`, `CONSTRAINT_VIOLATION`, `UNSAFE_OUTPUT`, `CONCURRENCY_LIMIT`, `RATE_LIMITED`.

---

## D) Sex vs gender (documented carefully)

Three separate constructs, three separate fields.

| Construct | Field | Used for | Never used for |
| --- | --- | --- | --- |
| Gender identity (optional) | `profiles.gender_identity` (new, nullable; `woman`, `man`, `non_binary`, `self_describe`, `prefer_not`) + optional `pronouns` | Respectful copy, pronouns in coach lines | Physiology, targets, load, exercise selection |
| Physiological input for equations | `physiology_profile.sex_for_equations` (`female` \| `male` \| null) + `life_stage` | Named energy equation only (e.g. DRI 2023 / Mifflin-St Jeor variant). Label equation and show "estimate". | Anything else; never inferred from name, photo, pronouns, or gender identity |
| Display / imagery preference | `preferences.imagery_preference` (`auto` \| `neutral` \| `feminine` \| `masculine`) | Which exercise illustration set / hero art to show | Targets or safety logic |

Rules:
1. Existing `profiles.sex` is the legacy column. Migration copies it to `physiology_profile.sex_for_equations` only when the value is `female` or `male`; `other` / `prefer_not` → null. Keep `profiles.sex` readable for one release, then drop.
2. Onboarding asks "Used for calorie estimates only" with options Female, Male, Prefer not to say. Choosing "prefer not" or leaving null switches to a neutral equation (average of both) or manual kcal target, and says so in the UI.
3. **Workout imagery/copy may use opted physiological sex for relevance** (e.g. which illustration variant, or a note that a calorie estimate uses that input). Resolution order for imagery: `imagery_preference` if not `auto` → else `sex_for_equations` if consented → else neutral. Never use `gender_identity` alone to pick stereotyped assets. A user who sets gender identity to non-binary and leaves everything else gets neutral art.
4. Assets are tagged by body-type/style variant (`neutral`, `variant_a`, `variant_b`), not "men's / women's" labels, so copy and filenames avoid stereotyping. The user can change imagery in Settings at any time.
5. Plan progression (load, volume) uses logged performance, RPE, recovery, and goals, not sex. No cycle-phase programming. Any symptom-aware adjustment is a later opt-in feature.
6. Pregnancy/lactation: `life_stage` ≠ `none` disables the generic equation and forces manual target plus a "talk to your clinician" notice. Not a gender branch.
7. Envelope: `sexForEquations` appears in `profile` only for `meal_plan` target computation and `workout_plan` calorie estimates, never in `coach` or `recipe_chat`. `gender_identity` appears only as `pronouns`/tone hint in `coach`.

---

## E) Token guardrails + credits

| Control | Value | Enforced in |
| --- | --- | --- |
| Max user message | 500 chars | Zod + route |
| Max turns / thread | 8 (config `RECIPE_CHAT_MAX_TURNS`) | route, `409 THREAD_CAPPED` |
| Recent turns in prompt | 6, older → `summary` (≤250 tokens) | context builder |
| Profile + constraints | ≤350 tokens | envelope budget check (throws in dev, truncates memories first in prod) |
| Candidates | ≤8 catalog rows, compact fields | `RecipeCatalogPort` |
| Max output tokens | per feature table in §B | adapter passes `max_output_tokens` |
| Tool rounds | 3 | adapter loop |
| Wall clock | 45 s abort | adapter |
| Rate | 6 req/min/user, daily per-feature caps (`AI_QUOTAS`) | existing `canSpend` + DO |
| Concurrent runs | free 1, pro 2 | `AiReserveDO` |
| Global kill switch | monthly provider micros cap per app | existing `ai-budget` |

**Reserve → settle algorithm** (`services/ai-credits.ts`, replaces `assertCanSpend`/`recordUsage` call sites incrementally):

1. `reserve(userId, feature, clientRequestId)`: inside the DO, in one D1 `batch`: check tier, daily cap, global cap, open-reservation count, balance ≥ `credits_reserved`; insert reservation (`open`) + ledger `reserve` rows (negative, per bucket in spend order). Duplicate `request_hash` returns the existing reservation (idempotent client retries).
2. Call provider. On success, `settle(reservationId, usage)`: charge = fixed action price (v1), insert `settle` row, insert `release` row for any unused part, write `ai_usage_events` and bump `ai_usage_daily`.
3. On provider failure with no usable result, or validation failure after repair: `release(reservationId, "full")` (credits back, no usage charge).
4. Disconnect mid-stream: settle in `waitUntil` with recorded usage. Crash: cron expires `open` rows past `expires_at` and releases them.
5. **Zero balance**: `402 OUT_OF_CREDITS`, no provider call. Heuristic and manual paths (manual swap, heuristic plan, text-only coach pills) remain available and cost nothing. Heuristic results never reserve credits (preserve existing behaviour).
6. Warn at 80% and at 0 in `GET /v1/credits.warnings[]`.

Entitlement stays RevenueCat webhook → `entitlements` (existing). Mobile never writes balances.

---

## F) Migration order and plug-in strategy (no big-bang)

`preferences` is not rewritten. It stays the explicit-settings table; new tables hang beside it.

| Step | Change | Risk |
| --- | --- | --- |
| 1 | **Contracts**: add `ai-context.ts` Zod; add `cuisineStyles`, `physiqueTarget`, `lifestyleNotes` to mobile `LocalProfile` types. No behaviour change. | none |
| 2 | **Mobile SQLite migration** `sql-00N`: add `cuisine_json`, `physique_target`, `lifestyle_notes` to local `preferences`; update repo upsert/read (`repositories/profile.ts`) and `reassign-user.ts`. | low |
| 3 | **API `0008`**: `ai_credit_ledger`, `ai_credit_reservations`, `ai_credit_balance`, `attendance_day`, `recipe_chat_threads`, `recipe_chat_turns`, `physiology_profile`; `profiles.gender_identity`, `preferences.imagery_preference` (nullable adds). Backfill monthly grants lazily on first `GET /v1/credits`. | low (additive) |
| 4 | **Port**: `PersonalizationContextPort` + `parsePreferencesRow`; make `buildPlanPrefsJson`/`buildPlanProfileJson`/meal-plan loaders call it. Golden test: envelope fields equal the old output for existing users. | medium, guarded by test |
| 5 | **Constraint enforcement**: `RecipeSafetyPolicy`; equipment filter in `heuristic-plan-generator` + post-validation for `plan_gen`; reuse in meal plan and revise paths. | medium |
| 6 | **Credits shadow mode**: `ai-credits.ts` runs beside `ai-budget`, writes ledger, does not block. Compare totals for a week. | low |
| 7 | **Credits enforce**: switch `coach`, `meal_plan`, `plan_gen`, `meal_estimate`, `voice_tts` to reserve/settle; ship `GET /v1/credits`; alias `/v1/ai/usage`. | medium |
| 8 | **Recipe chat** route + port + thread tables; mobile UI later. | medium |
| 9 | **Attendance** ping + strip read; wire writes from session/meal/check-in services. | low |
| 10 | **Physiology split**: onboarding copy + `physiology_profile` backfill; drop `profiles.sex` reads. | low |

Steps 1–3 are independent and can run in parallel. 4 blocks 5 and 8. 6 blocks 7. Wrangler: add the `AiReserveDO` binding in step 6.

Rollback: every step is additive. Disable enforcement with `AI_CREDITS_MODE=off|shadow|enforce` (env), defaulting to `shadow` until step 7.

---

## G) Acceptance tests / smoke checklist

Unit / contract (vitest, `apps/api`):
- [ ] G1 `ContextEnvelopeSchema` rejects hard constraints with `source ≠ user_setting`, >40 constraints, >8 memories.
- [ ] G2 Envelope for each feature contains only the fields in the §A table (snapshot test). `gender_identity` absent from `meal_plan`, `workout_plan`, `recipe_chat`.
- [ ] G3 Cuisines `["other"]` + no hints → catalog = universal + `other`-tagged only (not full catalog). `["other"]` + hint "thai" adds thai.
- [ ] G4 Rebuild preview with cuisine, lifestyle notes, physique target, equipment set: generator input JSON contains all (golden compare vs onboarding input).
- [ ] G5 Mobile: complete onboarding with cuisines `["italian","other"]` + other text; kill app; `getLocalProfile()` returns cuisines and notes; `PUT /v1/onboarding` sync sends them.
- [ ] G6 Equipment `["bodyweight"]`: heuristic plan has zero barbell/machine exercises; OpenAI path with a mocked response containing "Barbell squat" is rejected by post-validation.
- [ ] G7 Ledger: reserve 1, settle 1 → balance −1. Reserve then provider error → balance unchanged. Replay same `clientRequestId` → one reservation. Expired open reservation released by cron.
- [ ] G8 Balance 0: `POST /v1/recipe/chat` → `402 OUT_OF_CREDITS`, provider mock call count 0, ledger rows 0.
- [ ] G9 Turn 9 on a thread (max 8) → `409 THREAD_CAPPED`, no charge.
- [ ] G10 Allergy nuts + message "swap in peanut butter" → `422 CONSTRAINT_VIOLATION` before LLM (mock not called). Model output containing a nuts-tagged id → repair once, then `UNSAFE_OUTPUT`, full release.
- [ ] G11 `max_output_tokens` forwarded to provider mock equals §B value; tool loop stops at 3 rounds; 45 s abort releases reservation.
- [ ] G12 User B cannot read or post to user A's `mealId`/`threadId` (404).
- [ ] G13 Sex: `sex_for_equations` null → neutral/manual target path and UI note; gender identity "woman" with `sex_for_equations` null → imagery `neutral`; `imagery_preference=masculine` overrides; pregnant `life_stage` disables equation.
- [ ] G14 Attendance: two pings same day → one row; ping near local midnight uses profile timezone; session end sets `workout_done`.

Smoke (`apps/mobile/scripts/smoke-ai-credits.mjs`, curl against `api:dev`):
- [ ] S1 `GET /v1/credits` new user: monthly grant present, costs table, warnings empty.
- [ ] S2 Generate meal plan → credits drop by 3; heuristic fallback (no key) drops 0.
- [ ] S3 Recipe chat swap on a plan item: item macros recomputed from catalog; reply under 500 tokens.
- [ ] S4 Drain credits via loop → next call `402`; manual swap endpoint still `200`.
- [ ] S5 `POST /v1/attendance/ping` then Today strip shows today's dot (Playwright/Expo screenshot at 390 px, compare to Stitch).
- [ ] S6 Two-device: onboarding on A, rebuild on B keeps cuisine and equipment.
- [ ] S7 Logs contain `contextHash` and usage ids but no prompt text or health values.

Gates before In Review: `npm run typecheck` (api + mobile), vitest green, S1–S7 pass, STATUS decision rows added.
