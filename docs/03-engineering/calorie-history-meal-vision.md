# Calorie history + Cal AI–style meal vision

**Status:** architecture (2026-11-01). Ship behind ports. No medical claims.

## Goal

Durable day/week/month calorie + exercise history with charts; meal photo analysis (macros, micros, ingredients, warnings) with editable numeric UI; onboarding mirror + meal-log photos persisted to R2/D1.

## Current baseline (audit)

| Capability | State |
| --- | --- |
| Meals D1/SQLite (kcal P/C/F, optional media_id) | Exists |
| `POST /v1/meals/estimate` + `MealEstimator` port | Exists (macros only, sync) |
| Fuel today donut | Exists |
| Week/month charts API/UI | Missing |
| Workout session history list/charts | Missing |
| Micros / ingredients on meal logs | Missing |
| Async analysis queue | Missing (`plan_jobs` only) |
| Onboarding mirror → R2 | UI only (local URI) |
| Generic media upload URL | Documented, not implemented |
| MealEstimator in integrations table | Missing row (port exists) |

## Cal AI research (summary)

- Public reporting: OpenAI + Anthropic vision + RAG / food DBs; Play Store also cites Gemini Vision.
- Marketing: phone depth for volume — **out of scope for Mirra v1**.
- Accuracy claims ~80–90%; always editable + confidence.
- Mirra MVP: extend OpenAI vision adapter (structured JSON); optional Anthropic later via `AI_PROVIDER`. User supplies key via wrangler / `.dev.vars`.

Evidence: `/tmp/mirra-qa/cal-ai-research/FINDINGS.md`.

## Product surfaces (Stitch)

1. **Fuel Today** — kcal ring, macro bars, today’s meals list, CTA snap/describe  
2. **Meal camera** — Photo / Describe tabs (barcode = v2)  
3. **Analyzing** — motion / shimmer while estimate runs  
4. **Meal result** — big numbers (kcal + P/C/F), ingredient rows, micros chips, confidence, Fix, Save  
5. **History** — Day / Week / Month toggle; bar + line charts for kcal vs target; workout minutes/volume  
6. **Onboarding mirror** — capture + upload prove (existing S10 polish)

Match Kinetic Performance tokens (`stitch_mirra_ai_personal_trainer/kinetic_performance/DESIGN.md`). Prefer lime primary-container, Space Grotesk metrics.

## Data model (D1 + SQLite mirror)

### Extend `meals`

| Column | Type | Notes |
| --- | --- | --- |
| fiber_g / sugar_g / sodium_mg | integer null | micros P0 subset |
| ingredients_json | text null | `[{name, grams?, kcal?, proteinG?, carbsG?, fatG?, confidence?}]` |
| warnings_json | text null | string[] wellness notes (not diagnosis) |
| analysis_status | text | `none` \| `pending` \| `ready` \| `failed` |
| analysis_source | text null | `openai` \| `heuristic` \| … |
| estimate_confidence | real null | 0–1 |
| media_id | text null | FK media_objects (meal) |

### New `nutrition_day_rollup` (optional but preferred)

| Column | Notes |
| --- | --- |
| user_id, local_date | PK |
| kcal_in, protein_g, carbs_g, fat_g | sums from meals |
| kcal_target | from plan/prefs |
| workout_minutes, sets_completed | from sessions |
| updated_at | |

Rebuild on meal/workout write (sync) so charts stay cheap. Cache same shape in SQLite.

### `meal_analysis_jobs` (queue)

| Column | Notes |
| --- | --- |
| id, user_id, meal_id?, media_id | |
| status | queued / running / done / failed |
| input_json | description, image key |
| result_json | MealEstimateResult v2 |
| error, created_at, finished_at | |

Workers: cron or queue consumer (same pattern as `plan_jobs`). Sync `POST /v1/meals/estimate` remains for interactive UX; job path for retry / offline flush.

### Media

Implement `POST /v1/media/upload-url` + confirm for kinds `meal` \| `mirror` \| `progress`. Onboarding complete / meal save must set `media_id` after R2 put.

## API

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/v1/meals/estimate` | Expand response: ingredients, micros, warnings; credits/budget |
| POST | `/v1/meals` | Accept new fields; optional `analyzeAsync` |
| GET | `/v1/meals` | Already paginated — ensure history UI uses it |
| GET | `/v1/nutrition/summary?range=day\|week\|month&anchor=` | series for charts |
| GET | `/v1/workouts/sessions?from=&to=` | history list |
| GET | `/v1/workouts/summary?range=` | minutes / volume series |
| POST | `/v1/media/upload-url` | R2 presign / worker put helper |
| POST | `/v1/onboarding/mirror` | attach mirror media_id |

Auth: existing `requireAuth`. AI: existing credit / scan budget gates.

## Port: MealEstimator v2

```ts
type MealEstimateResultV2 = {
  name: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
  ingredients: Array<{
    name: string;
    grams?: number;
    kcal?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
    confidence?: number;
  }>;
  warnings: string[];
  confidence: number;
  notes?: string;
  source: "openai" | "anthropic" | "heuristic";
};
```

Factory already picks OpenAI vs heuristic. Document row in `integrations.md`. Optional Anthropic adapter behind `AI_PROVIDER`.

## Mobile

- Fuel: history entry + charts (Victory Native / Skia / SVG — prefer existing chart dependency if any; else simple SVG bars first).  
- Log meal: camera + analyzing Moti shimmer → result screen with steppers.  
- Onboarding mirror: upload on continue.  
- SQLite: mirror new columns + rollup table; hydrate charts offline.  
- sx() only; Stitch match required for new screens.

## Scenario matrix (smoke)

1. Snap meal → analyzing → result numbers → edit ingredient → save → Fuel today updates  
2. Describe-only estimate → save  
3. Estimate fail / low confidence → Fix sheet  
4. Week chart: 7 days kcal vs target after seeded meals  
5. Month toggle renders  
6. Workout complete → exercise series updates  
7. Onboarding mirror upload → media_objects kind=mirror  
8. Offline: local meal then sync  
9. Unauth → 401 on estimate  
10. Scan budget exhausted → paywall/credits CTA  
11. Delete meal → rollup + chart update  
12. Returning user: history list scroll / pagination  

## Non-goals (v1)

Depth-sensor volume, barcode, Apple Health, medical advice, custom trained food model.

## Ship line

One ticket branch per slice → push → merge `main` → remove worktree → local smoke → `eas update --branch day-test` from clean `origin/main`.
