# Meal plans — Fuel "Today's plan"

Status: design (v1). Related: `integrations.md`, `api.md`, `d1-schema.md`, `accountability-coach.md`, Stitch S18.

## 1. Goal and competitor P0s
Turn existing plan macro targets into **what to eat today**, not a recipe app.

| # | P0 | How |
| --- | --- | --- |
| 1 | Daily meal cards, portions (g + household unit) + macros | `PlannedMeal.items[]`, server-computed |
| 2 | One-tap log into Fuel | Reuse `POST /v1/meals` + `fuel-store.addMeal` |
| 3 | Coach proposes, user Accept / Swap | Cards are proposals; `Log` = accept, `Swap` = replace |
| 4 | Rebalance after off-plan log | `POST .../rebalance` regenerates only unlogged slots |
| 5 | Grounded | LLM picks `foodId` + grams from a vetted catalog; **server computes macros** |
| 6 | No recipe-site clone | No recipes, steps, photos, ratings. Compact cards only (S18 rule) |

## 2. Audit (what exists)
- `PlanSummary` has `kcalTarget/proteinG/carbsG/fatG`; `defaultFuelTargets(summary)` feeds `GET /v1/fuel/today`.
- No meal-plan table. `MealEstimator` (`ports/meal-estimator.ts`) is photo/description only, not planning.
- Logging: mobile `fuel-store.addMeal` (local SQLite first, then `createMeal` -> `POST /v1/meals`) with `MealBodySchema` (`name, mealSlot, kcal, P/C/F, eatenAt`).
- `services/today-actions.ts` already emits `meal` ("N of M meals logged") and `protein` goals; `ctaRoute` = `/(tabs)/fuel?sheet=log`.
- Pattern to copy: `lib/meal-estimator.ts` factory + `resolveAiProvider(env)` + `logAiUsage`.

## 3. Grounding (no fake barcode DB)
`apps/api/src/data/vetted-foods.ts` — static, versioned, ~100 common foods (USDA FDC-derived values, committed as constants).

```ts
type VettedFood = {
  id: string; name: string;                // "chicken_breast_cooked"
  per100g: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  unit: { label: string; grams: number };  // "1 palm" 120 | "1 cup" 185
  roles: ("protein" | "carb" | "fat" | "veg" | "fruit" | "dairy")[];
  slots: MealSlot[]; tags: string[];       // tags: "vegetarian" "dairy" "gluten" "nuts" "egg"
  minG: number; maxG: number;              // portion bounds
};
```

1. LLM never emits macros. It returns `{ slot, title, items: [{ foodId, grams }] }`.
2. Server rejects unknown `foodId`, clamps grams to `[minG, maxG]`, rounds to 5 g, then computes macros from `per100g`.
3. **Fit pass:** scale the primary carb/protein item grams (within bounds) so slot kcal lands within ±8% of the slot budget; if impossible, keep and set `fit: "approx"`.
4. Filter catalog by user diet/allergy tags **before** sending to the LLM (send only id/name/roles/unit, ≤120 rows) and again on validation.
5. Show `~` on macros (estimates). No barcode / branded items.

## 4. Ports and adapters (`integrations.md` pattern)
```
route -> services/meal-plan.ts -> getMealPlanGenerator(env, db)
          -> ports/meal-plan-generator.ts
             -> adapters/openai-meal-plan-generator.ts
             -> adapters/heuristic-meal-plan-generator.ts
```

```ts
// ports/meal-plan-generator.ts
export type MealPlanDraftMeal = { slot: MealSlot; title: string; items: { foodId: string; grams: number }[] };
export type MealPlanInput = {
  userId: string; date: string;
  targets: Macros; remaining: Macros;  // remaining == targets on generate
  slots: MealSlot[];                   // slots still to plan
  catalog: CatalogRow[];               // pre-filtered by diet/allergy
  avoidFoodIds: string[]; recentFoodIds: string[];  // swap / variety (last 3 days)
};
export type MealPlanGenerator = {
  generate: (i: MealPlanInput) => Promise<{ meals: MealPlanDraftMeal[]; source: "openai" | "heuristic" }>;
};
```

| Piece | Behavior |
| --- | --- |
| Factory `lib/meal-plan-generator.ts` | `resolveAiProvider(env)==="openai"` -> OpenAI, else heuristic. Same env vars as other ports |
| Heuristic | Deterministic: per slot pick protein + carb + veg/fat from `slots`/`roles` by seeded rotation (`hash(userId,date)`), avoiding `avoidFoodIds`. Always works with no keys; also the **fallback on any OpenAI error/invalid JSON** |
| OpenAI | JSON-schema output (`foodId` enum = catalog ids). Metered with `logAiUsage` + monthly cap check; on cap hit -> heuristic |
| Swap | Server-side, no LLM in v1: nearest-macro meal from heuristic with `avoidFoodIds = current items` (instant, free) |

## 5. Contracts (`packages/contracts/src/meal-plan.ts`, Zod)
```ts
PlannedItem   = { foodId, name, grams, unitLabel, unitQty /* 1.5 */, kcal, proteinG, carbsG, fatG }
PlannedMeal   = { id, slot: MealSlot, title, items: PlannedItem[], kcal, proteinG, carbsG, fatG,
                  status: "planned" | "logged" | "skipped", loggedMealId: string | null,
                  fit: "ok" | "approx" }
DayMealPlan   = { id, date, targets: Macros, planned: Macros, logged: Macros, remaining: Macros,
                  meals: PlannedMeal[], source: "openai" | "heuristic", rebalancedAt: number | null }
GenerateMealPlanBody  = { date?: string; force?: boolean }
LogPlannedMealBody    = { mealItemId: string; eatenAt?: number; mealId?: string /* client UUID, idempotency */ }
LogPlannedMealResponse= { plan: DayMealPlan; meal: MealResponse }
SwapBody      = { mealItemId: string }
RebalanceBody = { reason?: "off_plan_log" | "manual" }
GetTodayMealPlanResponse = { plan: DayMealPlan | null }   // null = not generated yet
```

`remaining` = targets − logged (all Fuel meals that day, plan or off-plan).

## 6. API (all `requireAuth`, new `routes/meal-plan.ts`)
| Route | Behavior |
| --- | --- |
| `POST /v1/meal-plan/generate` | Build today's plan from `loadCurrentPlan` targets. Idempotent per date unless `force`. 409 if no active plan. Returns `DayMealPlan`. `remaining` = targets − all meals logged that day (same as fuel/today); slots with a logged meal are not planned, open slots are trimmed to what `remaining` can fill (~400 kcal each, dinner/lunch first), and remaining < 150 kcal -> open slots returned `skipped` (200). `force` keeps logged items and replans only open slots |
| `GET /v1/meal-plan/today?date=` | Fetch persisted plan, recompute `logged/remaining` live from `meals`. `{plan:null}` if none. Never calls the LLM |
| `POST /v1/meal-plan/:id/log` | Validate item belongs to user+plan and is `planned`; insert into `meals` via the **same insert path as `POST /v1/meals`** (extract `insertMeal()` shared helper from `routes/fuel.ts`); set item `logged` + `logged_meal_id`. Idempotent on item (second call returns existing meal) |
| `POST /v1/meal-plan/:id/swap` | Replace one `planned` item's contents; keep slot and slot macro budget (±8%) |
| `POST /v1/meal-plan/:id/rebalance` | Re-plan only `planned` slots with `remaining` macros. Logged items untouched. Min-floor: if remaining kcal < 150, mark leftover slots `skipped` |

Errors via `lib/errors.ts`. Rate-limit generate/rebalance (≤10/day/user).

## 7. Persistence — decision: **persist** (`meal_plan_days` + `meal_plan_items`)
Why not ephemeral regenerate: LLM output is non-deterministic (cards would change between opens), swaps and logged-state need stable identity, regenerating per `GET` burns tokens, and `logged_meal_id` makes Log idempotent.

```sql
meal_plan_days(id PK, user_id FK cascade, local_date, plan_id NULL, source, targets_json,
  rebalanced_at, created_at, UNIQUE(user_id, local_date))
meal_plan_items(id PK, day_id FK cascade, slot, position, title, items_json /* PlannedItem[] */,
  kcal, protein_g, carbs_g, fat_g, status, logged_meal_id NULL, fit, updated_at, INDEX(day_id))
```

`items_json` (not a food-line table): lines are never queried alone. Migration `0003_meal_plans.sql` + `db/schema/meal-plans.ts`; add to `d1-schema.md` ER. Retention: prune >30 days in existing cron.

## 8. Off-plan log -> rebalance

Trigger: after `POST /v1/meals` when a plan exists and the meal matches no planned item or deviates >20% kcal. No auto-rewrite: client shows "Rebalance rest of day?" (Yes -> `.../rebalance`). Auto toggle = v1.1.

## 9. UI (mobile, `features/fuel/`)
- `meal-plan-store.ts` + `lib/api/meal-plan.ts`; Fuel hydrates `GET /today` with `/v1/fuel/today`.
- **Fuel "Today's plan"** section below macro meters, above logged list. Compact rows (S18 style, 12–13px): slot · title · `~kcal · P` and 1-line items `150 g (1 palm) chicken · 1 cup rice`. Actions: `Log` (primary text) · `Swap` (ghost). Logged rows collapse to a check. Empty: `Generate today's plan` button.
- `Log` -> `meal-plan/:id/log`; optimistic via `fuel-store.addMeal` (same local SQLite then POST), passing client UUID as `mealId`; fuel-store gains `markPlanLogged`. Offline: queue as normal meal, link on sync.
- **Today checklist** (`today-actions.ts`): meal goal `ctaRoute` -> `/(tabs)/fuel?section=plan` when a plan exists with a `planned` due slot, else existing log sheet.
- **Coach:** v1 = Coach can *mention* the plan and deep-link Fuel (read-only). **Accept tomorrow's plan = v1.1** (needs coach-proposal state, `generate` with `date=tomorrow`).

## 10. Build order
1. **Contracts + catalog:** `meal-plan.ts` Zod, `vetted-foods.ts`, macro/fit calculator + unit tests (pure).
2. **Persistence:** migration 0003, Drizzle schema, `services/meal-plan.ts`; extract `insertMeal()` from `routes/fuel.ts`.
3. **Generators:** port, heuristic adapter, OpenAI adapter, factory; metering + validation + fallback.
4. **Routes + smoke API:** 5 endpoints, mount in `app.ts`, update `api.md`, add `smoke-meal-plan.mjs`.
5. **Mobile UI:** store, Fuel section, Log/Swap/Rebalance prompt, Today CTA wiring; docs/handoff update.

## 11. Smoke matrix
| Case | Expect |
| --- | --- |
| Generate, no `OPENAI_API_KEY` | 200, `source=heuristic`, planned kcal within ±8% of target |
| Generate twice same date | Same cards (idempotent); `force` replaces |
| OpenAI invalid `foodId` / bad JSON | Fallback to heuristic, 200 |
| Allergy tag (nuts) | No item carries tag |
| Log item | 201 meal row; `/v1/fuel/today` logged increases; item `logged` |
| Swap | Different foods, slot kcal ±8%; logged items refuse swap (409) |
| Off-plan 800 kcal -> rebalance | Logged untouched; rest <= remaining kcal; <150 kcal -> `skipped` |
| No active plan | 409 on generate; `GET today` -> `{plan:null}` |
| Other user's item id | 404 |
| Offline log | Saved locally, item linked after sync |
| Today checklist | Meal goal opens Fuel plan section; log twice = no double count |

## 12. Out of scope

Grocery lists / shopping, barcode or branded-food DB, micronutrients / vitamins, recipes and cooking steps, meal photos, multi-day or weekly plans, auto-rebalance (v1.1), Coach Accept-tomorrow (v1.1).
