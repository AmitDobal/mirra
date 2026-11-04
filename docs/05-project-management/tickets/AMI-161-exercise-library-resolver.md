# AMI-161 — Exercise library, muscle taxonomy, name resolver + ExerciseTagger port

**Wave 1** · parallel with AMI-162, AMI-163, AMI-164 · **Depends:** none · Arch §2, §3, §5 (0018)

## Why
AI plan lifts do not match the 20-entry mobile catalog: 6 of 17 matched, the rest show "0% focus". Tiers and anatomy need a canonical exercise id plus muscle involvement for every plan lift.

## Scope
1. `packages/contracts/src/muscles.ts`: `MuscleIdSchema` (18 ids), `MuscleGroupIdSchema` (6), `MUSCLE_GROUP_OF`, `ExerciseMuscleSchema {id, pct, role}`.
2. `packages/contracts/src/exercise-library.ts`: `LibraryExerciseResponseSchema` for `GET /v1/exercises/:canonicalId`. `PlanExerciseSchema` (plans.ts) gains `canonicalId: string | null` and `muscles: ExerciseMuscle[]` (both defaulted, backward compatible).
3. Library data, ~120 entries (§3 shape), split by pattern. It must cover every name in `heuristic-plan-generator.ts`, `plan-tuning.ts`, `workout-swaps.ts` and `apps/mobile/src/content/exercise-catalog.json`. The `standard` field references only the anchor ids in §3. AMI-165 owns the numbers.
4. `normalize()` and a token-set matcher (pure, exported for AMI-166).
5. Port `ExerciseTagger` + OpenAI adapter (strict json_schema) + heuristic adapter + factory `getExerciseTagger(env)`. Add the row to `integrations.md`.
6. Migration `0018_exercise_library.sql` + Drizzle schema: `exercise_tags`, `workout_exercises.canonical_id`, `set_logs.canonical_id` + index.
7. `services/exercise-resolve.ts`: resolve a batch, cache misses in `exercise_tags`. Call it from `persist-plan.ts` (one tagger call per plan) and write `canonical_id`. Plan read path returns `canonicalId` + `muscles`.
8. `routes/exercises.ts`: `GET /v1/exercises/:canonicalId` (auth required). Accepts `tag:*` ids from the cache.
9. `scripts/assert-exercise-resolve.ts` (`test:exercise-resolve`) + fixture `scripts/fixtures/ai-plan-exercise-names.json` (≥100 names captured from local OpenAI plan runs).

## File ownership (only these)
`packages/contracts/src/muscles.ts` (new), `exercise-library.ts` (new), `plans.ts` · `apps/api/src/data/exercises/*` (new) · `apps/api/src/lib/exercise-library/*` (new) · `apps/api/src/ports/exercise-tagger.ts`, `ports/index.ts` · `apps/api/src/adapters/{openai,heuristic}-exercise-tagger.ts` · `apps/api/src/lib/exercise-tagger.ts` · `apps/api/src/services/exercise-resolve.ts`, `services/persist-plan.ts`, `services/plan-loaders.ts` (read mapping only) · `apps/api/src/db/schema/exercise-tags.ts`, `schema/plans.ts`, `schema/activity.ts` (column only) · `apps/api/src/db/migrations/0018_*` + meta · `apps/api/src/routes/exercises.ts` · `apps/api/scripts/assert-exercise-resolve.ts`, `scripts/fixtures/*` · locks: contracts index, schema index, app.ts, api package.json, integrations.md.

## Acceptance criteria
1. `npm run test:exercise-resolve`: ≥95% of fixture names resolve to a library id **without** the tagger. Zero equipment cross-matches ("dumbbell row" never maps to `barbell_row`).
2. Tagger output that fails Zod (unknown muscle id, pcts not 100 ±2) falls back to the heuristic adapter. No key → heuristic path works.
3. `POST /v1/plans/generate` on a fresh dev user: every exercise in the `GET` plan has a non-null `canonicalId` and non-empty `muscles`. Paste the JSON excerpt in the PR.
4. A second plan generation with the same names makes zero tagger calls (cache hit; log line shows it).
5. Library files ≤300 lines each. Each entry's muscles sum to 100. The assert script checks every entry.
6. `GET /v1/exercises/bench_press` returns name, muscles with roles, scoring. Unknown id → 404.
7. No mobile files touched.

## Path index
`apps/api/src/services/persist-plan.ts`, `services/plan-loaders.ts`, `lib/plan-tuning.ts`, `services/workout-swaps.ts`, `adapters/heuristic-plan-generator.ts`, `adapters/openai-meal-estimator.ts` (json_schema pattern), `lib/plan-generator.ts` (factory pattern), `apps/mobile/src/features/exercise/body-map/muscle-regions.ts` (keyword table to port).
