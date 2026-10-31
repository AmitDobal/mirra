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
| `PlanGenerator` | `getPlanGenerator(env)` | OpenAI | Heuristic |
| `CoachAdvisor` | `getCoachAdvisor(env)` | OpenAI | Heuristic |
| `PlanReviser` | `getPlanReviser(env, db)` | OpenAI (JSON intent) | Heuristic rules |
| `MealEstimator` | `getMealEstimator(env)` | OpenAI vision | Heuristic keywords |
| `ObjectStore` | `getObjectStore(env)` | R2 (when wired) | Stub |
| `SpeechSynthesizer` | `getSpeechSynthesizer(env, db)` | ElevenLabs (D1 + R2 cache) | Stub (text-only) |
| `AiBudget` (service, not a vendor) | `assertCanSpend` / `canSpend` / `recordUsage` in `services/ai-budget.ts` | D1 `ai_usage_*` | n/a. Over budget → heuristic adapter |
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
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Reserved for Anthropic adapter |
| Future Workers AI | Bindings + `AI_PROVIDER=workers-ai` |
| `VOICE_PROVIDER` / `ELEVENLABS_API_KEY` | TTS switch. See `ai-cost-and-voice.md` |

## Agent / PR checklist

- [ ] New vendor? Port first (or extend existing port), then adapter, then factory case
- [ ] Feature code imports **port or factory only**
- [ ] Stub / heuristic path still works without keys
- [ ] Secrets in `.dev.vars` / `wrangler secret` only
- [ ] Document the adapter row in this file’s table

## Why

Swap OpenAI → Anthropic / Workers AI / local model without rewriting Coach UI or plan jobs. Same for RevenueCat → another IAP wrapper, R2 → S3-compatible, etc.
