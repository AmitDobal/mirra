# AI cache, weight journey, food data

## Goals

1. Log daily body weight; chart loss/gain vs `goal_weight_kg`; feed latest kg into personalization (hydration, plan rebuild, coach context).
2. Macros from **catalog first**, not the LLM. Micros stay out of UI until a real source is wired.
3. Mark every LLM surface with the shared **AI sparkles** badge.
4. Cut repeat AI calls when users bounce between tabs: **TTL cache + corner refresh**.

## Food / snack macros (truth order)

| Priority | Source | When |
| --- | --- | --- |
| 1 | D1 / `vetted-foods.ts` (USDA-based) | Meal plans, quick-add from plan |
| 2 | Manual entry | User typed macros |
| 3 | Free/low-cost API (USDA FDC live, Open Food Facts barcode, FatSecret if licensed) | Catalog miss — **not shipped yet**; port + adapter when needed |
| 4 | LLM `POST /v1/meals/estimate` | Photo / free-text only; label **Estimated**; user can edit |

**Do not** ask the LLM for micros as ground truth. Free commercial-safe stack: **USDA FDC bulk (CC0) → OFF barcode (ephemeral) → FatSecret/Edamam paid → LLM last**.

## Weight

- Table: `weight_logs` (already in D1 schema).
- API: `POST /v1/weight` `{ kg, loggedAt? }` · `GET /v1/weight?limit=` → `{ items: [{ id, kg, loggedAt }] }`.
- On POST: also update `profiles.weight_kg` so hydration + plan generators see the latest.
- Mobile: local SQLite `weight_logs` write-through + Progress sparkline + Log weight sheet.
- Journey: compare series to `goal_weight_kg` (loss if start > goal, gain if start < goal).

## AI call reduction

| Call | Default | Cache key | Refresh |
| --- | --- | --- | --- |
| `POST /v1/coach/advise` | Auto once per key; TTL **15 min** | `advise:{date}:{readiness}:{vectorId}` | Corner refresh, throttle **60s** |
| `GET /v1/voice/cue/today` | Once per local day (existing) | SecureStore date | N/A |
| `POST /v1/coach/revise` | On user message only | none | N/A |
| `POST /v1/meals/estimate` | On snap/describe only | none | N/A |
| `GET /v1/insights/today` | **Not LLM** — soft client TTL **2 min** to avoid churn | `insights:{date}` | Pull-to-refresh |

Client store: SQLite `ai_response_cache(key, payload_json, fetched_at, ttl_ms)`. Show cached payload immediately; network only on miss, TTL expiry, or explicit refresh after throttle.

## AI badge

`AiBadge` (`Sparkles` + optional “AI”) on Coach advise card, Plan chat, meal estimate, meal-plan generate, voice cue affordances.

## SQLite role

Local SQLite is the **write-through cache** for offline UX and AI response reuse — not a second source of truth. D1 remains authoritative when online.
