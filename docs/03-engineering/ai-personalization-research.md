# AI personalization context and credit metering

**Research date:** 2026-10-31  
**Scope:** Production patterns for workout plans, meal plans, recipes, and coaching chat. Recommendations target Mirra's Expo client, Cloudflare Workers API, D1, Zod contracts, ports/adapters, and RevenueCat.

## Executive recommendation

Mirra should use a **hybrid memory model**:

1. A small, versioned, structured profile for facts that affect deterministic behavior.
2. User-authored notes for open-ended preferences, stored as data rather than trusted instructions.
3. Derived signals from actual behavior, with provenance, confidence, and expiry.
4. A compact, purpose-built context snapshot per AI feature. Do not pass the full profile, raw history, or entire chat.

Plans should be assembled by deterministic domain services and validated data wherever correctness matters. The LLM should select, explain, and vary options inside those constraints. It should not calculate nutrition, decide allergy safety, infer physiology from gender identity, or own quota enforcement.

## 1. Preference memory schemas

### What production products expose

MyFitnessPal's Meal Planner asks for goals, challenges, diet and cuisine preferences, cooking time, allergies, restrictions, dislikes, household size, calorie targets, and macro targets. Users can edit these settings later and swap individual recipes without rebuilding the whole plan ([MyFitnessPal Help](https://support.myfitnesspal.com/hc/en-us/articles/34603055097869-How-to-use-the-Meal-Planner)). Fitbod combines stable settings such as goal, experience, equipment, schedule, and workout preferences with observed behavior such as logged sessions, exercise replacements, and recovery estimates ([Fitbod overview](https://help.fitbod.me/hc/en-us/sections/360001078993-Understanding-Fitbod-How-It-Works)).

These are not "one big memory." They separate:

- **Hard constraints:** allergy, injury/contraindication, dietary rule, available equipment.
- **Goals and targets:** strength, weight direction, kcal/macros, sessions per week.
- **Operational preferences:** time, budget, cuisine, disliked ingredients, workout duration.
- **Current state:** foods already eaten, remaining macros, soreness, readiness, schedule.
- **Behavioral evidence:** swaps, skips, ratings, logged performance.

Structured profiles are compact and low-latency. Mem0 recommends small JSON-schema profiles focused on durable traits, while Google Memory Bank describes a fixed-schema profile as the session initializer and keeps revision history for extracted fields ([Mem0 profiles](https://docs.mem0.ai/platform/features/user-profiles), [Google Memory Profiles](https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/memory-bank/profiles)). Free-form memories still cover facts that a fixed schema cannot anticipate.

### Mirra schema

Use explicit tables or equivalent normalized records, all scoped by `user_id`:

| Layer | Example fields | Authority and lifetime |
| --- | --- | --- |
| `user_profile` | birth year, height, weight trend, timezone, locale, units | Explicit user input. Current until edited. |
| `physiology_profile` | sex input used by a named energy equation, pregnancy/lactation state, menopause status if volunteered | Optional, purpose-limited, sensitive. Never inferred. |
| `training_preferences` | goal, experience, days, duration, equipment, excluded movements, injuries | Explicit settings. Hard constraints where marked. |
| `nutrition_preferences` | diet pattern, allergies, intolerances, disliked foods, cuisines, prep time, budget, household size | Explicit settings. Allergies are hard constraints. |
| `user_memory_notes` | "Prefers savory breakfasts", "travelling until Friday" | Atomic note, source, created/updated/expiry, confidence, status. |
| `derived_preferences` | frequently swaps mushrooms, accepts 30-minute workouts | Evidence count, source event IDs, confidence, expiry. Never silently promoted to a hard rule. |
| `daily_state` | remaining macros, completed workout, readiness, soreness, available time | Calculated from authoritative data. Short-lived. |

Every memory field should include `source` (`user_setting`, `user_message`, `behavior`, `health_sync`), timestamps, and a sensitivity class. Explicit settings override inferred preferences. A contradiction should prompt confirmation, not silent replacement. Users need a "What Mirra remembers" screen with edit/delete controls.

Do not store raw chat as long-term memory by default. Extract one atomic candidate fact, validate it with Zod, and either ask for confirmation or mark it as inferred and expiring. Treat stored free text as **untrusted data**, never as system instructions.

## 2. Prompt packing

Anthropic recommends clear system prompts, high-signal tool results, and just-in-time retrieval instead of preloading all available data ([context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), [tool design](https://www.anthropic.com/research/writing-tools-for-agents)). OpenAI similarly recommends retaining recent turns, summarizing older state, and giving each run a token budget before the next request ([session memory](https://developers.openai.com/cookbook/examples/agents_sdk/session_memory), [run budgets](https://developers.openai.com/cookbook/llms-full.txt)).

Recommended request layout:

1. **System:** stable role, safety boundaries, instruction hierarchy, feature-specific policy, and output contract. Keep user content out.
2. **Developer/domain context:** versioned algorithm name, allowed actions, hard validation rules, and schema version.
3. **Profile snapshot:** a compact JSON object containing only fields needed for this feature. Delimit it and state that it is data, not instructions.
4. **Current state:** deterministic totals and constraints computed server-side.
5. **Retrieved evidence:** only relevant recipe/exercise records, with stable IDs. Retrieval is for candidate selection, not user identity.
6. **Recent turns:** last 4 to 8 short turns. Replace older turns with a structured summary that preserves confirmed constraints, unresolved questions, and plan edits.
7. **User request:** current message.

Use tools for current authoritative facts and mutations, for example `get_today_macros`, `search_allowed_recipes`, `swap_plan_item`, and `log_meal`. Use RAG for a curated recipe/exercise catalogue or supporting evidence. Do not use vector similarity as the authority for allergies, entitlements, targets, or ownership.

Create a `PersonalizationContextPort` that returns a Zod-validated, feature-specific snapshot:

```ts
type ContextEnvelope = {
  schemaVersion: 1;
  feature: "coach" | "workout_plan" | "meal_plan" | "recipe_chat";
  profile: Record<string, unknown>;
  hardConstraints: Array<{ type: string; value: string; source: string }>;
  currentState: Record<string, number | string | boolean | null>;
  relevantMemories: Array<{ text: string; source: string; confidence: number }>;
  generatedAt: string;
};
```

Log the context schema version and hashes of selected records, not sensitive prompt bodies. This makes generations reproducible without copying health data into logs.

## 3. Sex and gender personalization

Sex, gender identity, and specific physiological traits are different constructs. The National Academies recommends precise, purpose-limited collection, opt-out, privacy, and avoiding one construct as a proxy for another ([report highlights](https://nap.nationalacademies.org/resource/26424/Highlights_Measuring_SGISO.pdf)). Mirra should therefore:

- Ask gender identity only for respectful identity and language.
- Ask a physiological input only when a named calculation requires it, explain why, allow "prefer not to answer," and offer a neutral/manual-target path.
- Never infer sex, hormones, pregnancy, menstrual status, or capability from name, appearance, pronouns, or gender identity.
- Use the user's measured performance, recovery, symptoms, goals, and preferences for plan progression.

There are legitimate sex/life-stage inputs in some reference equations. The 2023 National Academies energy equations use age, sex, height, weight, physical activity, and life stage, and report meaningful prediction error even within the same group ([DRI Energy summary](https://www.ncbi.nlm.nih.gov/books/NBK591034/), [full overview](https://www.nationalacademies.org/read/26818/chapter/2)). Mirra must label the equation and estimate, let the user override the target, and adapt from observed weight/intake trends. Pregnancy and lactation require dedicated equations and should not be treated as a generic gender branch.

Do not implement automatic "cycle syncing." Current reviews find insufficient evidence for phase-based resistance programming for most active women. Individual symptom tracking, sleep, fatigue, recovery, and readiness are more defensible adjustment inputs ([NSCA position statement](https://www.ovid.com/jnls/nsca-jscr/fulltext/10.1519/jsc.0000000000005493~national-strength-and-conditioning-association-position), [Frontiers umbrella review](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2023.1054542/full)). Any symptom feature should be opt-in and should adjust today's load only when the user reports an effect.

## 4. Meal and recipe chat with token guardrails

Production meal planners use a constrained workflow: collect preferences once, generate a bounded plan, allow swaps, then log or shop from structured recipes. MyFitnessPal supports 2 to 15 day plans and per-recipe swaps. It does not expose an unbounded blank chat as the plan database ([MyFitnessPal Help](https://support.myfitnesspal.com/hc/en-us/articles/34603055097869-How-to-use-the-Meal-Planner)).

For Mirra:

- Chat should produce **intent**, such as `swap`, `exclude`, `resize`, `explain`, or `regenerate_slot`.
- Domain services should perform mutations and macro calculations.
- Recipe output must reference catalogue ingredient IDs and quantities. Compute nutrition from canonical data after generation.
- Run deterministic post-validation for allergens, restrictions, ingredient availability, kcal/macro tolerance, serving bounds, and cooking temperature.
- Reject and repair invalid output before persistence. Never let model prose override a hard constraint.
- Show nutrition as an estimate and tell users with allergies to check product labels and cross-contamination. One published implementation describes a generate-then-server-filter loop and explicitly states that ingredient-name checks cannot guarantee cross-contamination safety ([Frittu allergen guide](https://www.frittu.app/allergens)).

Suggested limits per recipe-chat request:

| Control | Initial value |
| --- | --- |
| User message | 500 characters |
| Recent turns | 6 |
| Structured conversation summary | 250 tokens |
| Profile + hard constraints | 350 tokens |
| Retrieved recipe candidates | 8 records, compact fields only |
| Maximum model output | 500 tokens |
| Tool rounds | 3 |
| Stream duration | 45 seconds |
| User requests | 6/minute and plan-tier daily allowance |

Set `max_output_tokens`, abort on timeout, and stop tool loops before the reserved run budget is exhausted. A stream is not a quota bypass: reserve credit before opening it, settle actual usage after completion, and settle the recorded usage if the client disconnects. Keep partial text ephemeral; persist only schema-valid final results.

## 5. Credits and quota UX

Separate three concepts:

- **Entitlement:** Free or Pro access, synchronized from RevenueCat.
- **Product credits:** understandable feature units shown to the user.
- **Provider cost:** tokens, characters, and estimated micros used internally.

RevenueCat entitlements are appropriate for Pro access. Consumable credit packs should not be attached to a permanent entitlement. RevenueCat also warns that customer attributes are client-writable and must not store secure balances ([entitlements](https://www.revenuecat.com/docs/getting-started/entitlements), [customer attributes](https://www.revenuecat.com/docs/customers/customer-attributes)). Webhooks should trigger a server-side subscriber refresh and update D1 ([webhooks](https://www.revenuecat.com/docs/integrations/webhooks)).

Recommended UX:

- Show "AI actions remaining" by feature, reset date, and plan. Do not show raw tokens.
- Show the cost before expensive actions: for example, full plan generation costs more than a recipe swap.
- Warn at 80% and 100%. At zero, keep manual and heuristic features available.
- Monthly plan credits reset and do not roll over. Purchased or earned credits live in a separate ledger with explicit expiry.
- Referral rewards are granted only after a verified event, preferably the referred user's first paid conversion. Add idempotency, fraud checks, a monthly earning cap, and an expiry displayed before sharing.
- Do not offer automatic paid top-up in v1. Mobile store rules, parental controls, and accidental-spend risk make explicit consumable purchases safer.

Use reserve/settle/refund accounting:

1. Atomically check entitlement, daily feature cap, monthly allowance, purchased balance, concurrent streams, and global app budget.
2. Reserve the maximum feature charge.
3. Execute through the AI adapter with provider output limits.
4. Settle from actual usage or fixed action pricing.
5. Refund the unused reservation or the full amount on a provider failure that produced no usable result.

OpenAI's production budget guidance recommends counting the complete input and reserving maximum response cost before each model request, then returning unused budget afterward ([run budgets](https://developers.openai.com/cookbook/llms-full.txt)). For strict concurrency across Cloudflare locations, Workers' approximate rate limiter is insufficient; Cloudflare recommends a Durable Object for strict counters ([Workers rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)). Use a per-user Durable Object for concurrent reservations and D1 as the durable ledger/source of truth.

AI Gateway can retain cost, token, provider, status, and duration metadata without storing prompt/response payloads by setting `cf-aig-collect-log-payload: false` ([AI Gateway logging](https://developers.cloudflare.com/ai-gateway/observability/logging/)). This fits Mirra's health-data sensitivity.

## 6. Mirra architecture decision

Adopt these components behind ports:

| Component | Responsibility |
| --- | --- |
| `PersonalizationContextPort` | Builds minimum feature-specific snapshots from D1. |
| `MemoryExtractorPort` | Extracts candidate atomic preferences; cannot directly create hard constraints. |
| `RecipeCatalogPort` | Retrieves canonical recipes/ingredients and nutrition. |
| `RecipeSafetyPolicy` | Deterministic allergy, dietary, quantity, and cooking checks. |
| `AiBudget` | Reserve, settle, refund, cap, and usage summary. |
| `EntitlementPort` | Maps RevenueCat state to `free` or `pro`; webhook state is authoritative. |
| Existing AI ports | Consume context envelopes and return Zod-validated intents/results. |

D1 additions:

- `user_memory_notes` with provenance, confidence, expiry, and deletion.
- `context_snapshot_audit` with feature, schema version, selected record hashes, and no raw health data.
- `ai_credit_ledger` as append-only grants, reservations, settlements, refunds, expiries, and referral awards.
- `ai_usage_monthly` rollup by user and feature.
- `referrals` with inviter, invitee, state, reward event, and idempotency key.

Keep the current `ai_usage_events` and `ai_usage_daily` tables. Evolve `canSpend` into reserve/settle semantics. Preserve heuristic fallbacks. Replace the user-facing monthly-token concept with feature actions, while continuing to record provider tokens and `estimated_micros` internally. Gate full plan generation more tightly than chat replies or swaps.

### Suggested v1 allowances to validate with real cost data

| Feature | Free | Pro |
| --- | ---: | ---: |
| Coach AI replies/day | 5 | 30 |
| Meal/recipe chat replies/day | 5 | 30 |
| Full meal plans/month | 2 | 20 |
| Full workout plans/month | 2 | 12 |
| AI meal-photo estimates/day | 2 | 15 |
| Concurrent AI streams | 1 | 2 |

These are product hypotheses, not evidence-based constants. Launch behind server configuration, measure completion rate and `estimated_micros` by feature, then adjust without an app release. Retain a global per-app monthly provider-cost kill switch.

## Decisions proposal for STATUS

- **Propose:** Hybrid memory: typed profile plus provenance-bearing, expiring free-text notes.
- **Propose:** Feature-specific context snapshots; no raw-history prompt packing.
- **Propose:** Sex inputs only for named physiological equations; gender identity never used as a physiological proxy; symptom-led, not cycle-phase-led training changes.
- **Propose:** LLM proposes structured intent/candidates; deterministic services own nutrition, allergy checks, plan mutation, and validation.
- **Propose:** RevenueCat controls entitlement; D1 owns an append-only credit ledger; Durable Objects serialize live reservations.
- **Propose:** User-facing quotas are feature actions, with hard caps, one/two concurrent streams, referral rewards after verified conversion, and a global cost kill switch.
