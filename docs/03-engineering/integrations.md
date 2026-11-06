# Integrations — ports & adapters (hard rule)

**Every external vendor is behind a port.** Screens, routes, and domain services never import OpenAI / RevenueCat / R2 / Resend SDKs directly.

## Pattern

```
Feature / route
    → factory (getX / createX)
        → port interface (ports/*.ts)
            → adapter (adapters/*-openai.ts, *-revenuecat.ts, stub, …)
```

| Layer | Owns | Must not |
| --- | --- | --- |
| **Port** | Types + methods only | Provider SDKs, env keys, HTTP URLs |
| **Adapter** | One provider implementation | Business workflow (prefer call from service) |
| **Factory** | Pick adapter from env | Leak into UI components |
| **UI / route** | Call factory or feature service | `import … from "openai"` / RC internals |

## Current ports

| Port | Factory | Live adapter | Fallback / stub |
| --- | --- | --- | --- |
| `PlanGenerator` | `getPlanGenerator(env)` | OpenAI (prompt names the exact lift weekdays + session count) | Heuristic. Every adapter's week passes `fitPlanToTrainDays` (`lib/plan-train-days.ts`, AMI-184) in the factory and again in `persistGeneratedPlan`: lifts only on the user's train days, order kept, extras dropped, `[train-days]` log on a correction |
| `MealPlanGenerator` | `getMealPlanGenerator(env, db)` | OpenAI (strict `json_schema`: slot + foodId enums; `meal-plan-repair.ts` keeps valid meals, drops bad items) | Heuristic (no key, budget hit, nothing salvageable); missing slots filled per slot by `meal-plan-draft.ts` |
| `CoachAdvisor` | `getCoachAdvisor(env)` | OpenAI | Heuristic |
| `PersonalizationContextPort` | `getPersonalizationContext(env, db)` | D1 (`preferences` + `profiles`) | n/a. Envelope feeds `PlanGenerator` (`workout_plan`). See `ai-context-and-credits-architecture.md` §A |
| `MealEstimator` (v2: ingredients, fiber/sugar/sodium, warnings) | `getMealEstimator(env, db)` | OpenAI vision (strict `json_schema` structured output, `OPENAI_MODEL`) | Heuristic (no key, budget hit, or parse fail). `anthropic` source reserved |
| `ExerciseTagger` (unknown plan lifts → muscles, scoring, pattern; AMI-161) | `getExerciseTagger(env, db)` | OpenAI (strict `json_schema`, one batched call per plan, results cached in D1 `exercise_tags`, usage logged as system cost with `user_id` null) | Heuristic keyword table (no key, API error, or per-item Zod fail: unknown muscle id, pcts not 100 ±2) |
| `ObjectStore` | `getObjectStore(env)` | R2 (when wired) | Stub |
| `PurchasesPort` (mobile) | `getPurchases()` / `createPurchases()` | RevenueCat | Stub |

## Adding a provider (example: Anthropic for plans)

1. Implement `createAnthropicPlanGenerator(env): PlanGenerator` in `adapters/`.
2. Register in `lib/plan-generator.ts` (or `lib/ai/registry.ts`) under id `anthropic`.
3. Set `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` (never commit secrets).
4. No route or screen changes if the port shape is unchanged.
5. Keep OpenAI adapter; do not delete fallbacks until the new one is proven.

Same steps for payments (new `PurchasesPort` adapter), email, push, storage, analytics.

## Env switch (AI)

| Var | Role |
| --- | --- |
| `AI_PROVIDER` | `openai` \| `heuristic` \| `anthropic` \| `workers-ai` (explicit). Empty = auto |
| Auto | If `OPENAI_API_KEY` → openai; else heuristic |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | OpenAI adapter |
| `OPENAI_MODEL_<FEATURE>` | Per-feature model override (AMI-199): `MEAL_PLAN`, `PLAN_GEN`, `REVISE`, `COACH`, `MEAL_ESTIMATE`, `CHEF`, `EXERCISE_TAG`. Caps in `lib/ai/feature-config.ts` |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Reserved for Anthropic adapter |
| Future Workers AI | Bindings + `AI_PROVIDER=workers-ai` |

## Diet safety guard (AMI-199)

Every meal path is provider-agnostic and guarded the same way, whatever adapter drafted it:

1. `lib/diet-constraints.ts` `resolveDietConstraints` = THE resolver: diet tags (`vegetarian`, `vegan`, `pescatarian`, `eggetarian`, `jain`, `halal`, `kosher`, `no_beef`, `no_pork`, `no_red_meat`, `dairy_free`, `gluten_free`, ...), the free-text avoid list, cuisine cultural defaults (`indian` → no beef, no pork; `middle_eastern` → no pork) and a small profile-timezone table. Never inferred from a name. No opt-out UI exists, so defaults always apply.
2. Before generation: the catalog is filtered (`filterCatalogBy`) and the OpenAI prompt gets `diet.neverInclude` + `diet.allowedProteins`. Chef gets `neverInclude` too.
3. After generation: `lib/diet-guard.ts` rejects any dish holding a banned food (slot re-drafted by the heuristic from the allowed catalog) and rebuilds titles that name one. Chef replies / recipes, plan-chat replies are scanned with `findBannedTerm` (synonyms: steak, veal, brisket, pastrami, pepperoni, ham, bacon, lard, gelatin, "burger" unless "chicken / veggie burger", ...). Every hit logs `[diet-guard]`.
4. `MealPlanInput.diet` is required, so a new path cannot skip it. Legacy rows: `scripts/fix-banned-meals.mjs` (dry run by default).

## Agent / PR checklist

- [ ] New vendor? Port first (or extend existing port), then adapter, then factory case
- [ ] Feature code imports **port or factory only**
- [ ] Stub / heuristic path still works without keys
- [ ] Secrets in `.dev.vars` / `wrangler secret` only
- [ ] Document the adapter row in this file’s table

## Why

Swap OpenAI → Anthropic / Workers AI / local model without rewriting Coach UI or plan jobs. Same for RevenueCat → another IAP wrapper, R2 → S3-compatible, etc.
