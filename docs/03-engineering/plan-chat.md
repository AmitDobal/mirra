# Plan chat (AI plan revision)

Users chat to change the plans they already have (equipment, lift preferences, food limits, session length). It **revises existing rows**. It never builds a parallel planner.

## Entry points

| Where | How |
| --- | --- |
| Coach tab | "Adjust plan with AI" button |
| Fuel → Today's plan header | "Ask coach" link |
| Today → Routine card | "Ask coach" link |
| Route | `apps/mobile/app/(tabs)/plan-chat.tsx` (dock hidden) |

## Contract (`packages/contracts/src/coach.ts`)

`POST /v1/coach/revise`

- Body `CoachReviseBody`: `message` (1..2000, trimmed), `scope?` (`auto|meal|workout|both`), `date?`, `dryRun?`, `context?` `{ workoutId?, mealItemId?, exerciseId? }`.
- Response `CoachReviseResponse`: `message`, `changes[{kind,summary}]`, `applied`, `source`, `mealPlan?`, `workoutTitle?`, `warnings?`.
- Empty or whitespace message → 400. Daily cap 40 (`audit_log` action `coach.revise`) → 429.

## Flow

```
route → services/plan-revise.ts
  → getPlanReviser(env, db)   (port PlanReviser: OpenAI JSON intent, heuristic fallback)
  → intent { equipmentAdd/Remove, foodsAvoidAdd, dietTagsAdd, forceMealRegen, reviseWorkout, preferBench?, shortenMin? }
  → apply (unless dryRun)
```

## Apply

1. **Prefs** (`preferences`): `equipmentJson`, `foodsAvoid`, `dietTagsJson`, `sessionMinutes` (snapped to 20/30/45/60). Removing gear from `full_gym` expands it to its parts first. Food limits that leave an empty catalog are rejected with a warning.
2. **Meals**: `generatePlan(..., { force: true })` when food prefs changed or `forceMealRegen`. With `context.mealItemId` and no pref change, only that meal is swapped. Logged meals are kept.
3. **Workout**: rewrites the exercises of `context.workoutId`, else the workout on `date`. `services/workout-swaps.ts` holds `SWAP_MAP` (cables → bands/dumbbells, machines/barbell → dumbbells/bodyweight). `preferBench` swaps a push move for a bench variant on push days. `shortenMin` caps duration and drops tail moves (min 2).
4. `scope` limits which parts apply (`auto`/`both` apply everything the intent contains).

## Edge cases

- No workout that day: warning, equipment still saved for future plans.
- Duplicate result after a swap: the old move is dropped (never fewer than 2 moves).
- No substitute found: warning, move left as is.
- Unrecognised message: no changes, reply lists example phrases.
- Meal rate limit (10/day) or no plan: warning, prefs still saved.
- "Vegetarian dinner" sets the vegetarian diet tag for all meals (no per-slot diets yet). "No chicken" excludes all `meat`-tagged foods (existing `meal-diet` keyword map).
- `dryRun` describes changes and persists nothing (still counts toward the daily cap).

## Smoke

```
API_BASE=https://mirra-api.amit-dobalwork.workers.dev node apps/api/scripts/smoke-plan-chat.mjs
```

Covers: empty message 400, dryRun no persist, "no cable" → workout swaps, "no dairy" → meal regen with no dairy foods. Uses a fresh dev user (`ALLOW_DEV_USER_HEADER=true`).
