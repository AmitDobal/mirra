# AMI-179 — Goal API: D1 tables, GET /v1/goal, restart, recompute triggers

**Wave 2** · parallel with AMI-180 · **Depends:** AMI-178 merged, AMI-176 merged (profile PATCH) · Arch §4, §5

## Why
The server owns the user's goal plan (frozen start weight, versions) and re-projects it from real weigh-ins, sessions, check-ins and meals so the app and the AI read one truth.

## Scope
1. Migration `0021_goal_timeline.sql` + `_journal.json` entry + `db/schema/goal.ts`: `goal_plans`, `goal_snapshots` exactly as §4, including the partial unique index on the active plan. Number `0021` is reserved for this ticket. If `origin/main` already has a `0021`, take the next free number and tell PM.
2. `apps/api/src/lib/goal/inputs.ts` (pure): D1 rows → engine input (profile, prefs, weight logs, planned lift days, sessions, check-ins, daily kcal vs target, strength next target).
3. `services/goal-store.ts` (plan versioning, supersede + insert in one `db.batch`), `services/goal-refresh.ts` (`refreshGoalSafe(db, userId, trigger)`: load inputs, `projectGoal`, upsert today's snapshot, ≤8 statements, try/catch + log), `services/goal-read.ts` (GET body + lazy backfill §4).
4. `routes/goal.ts`: `GET /v1/goal` (ETag / 304), `POST /v1/goal/restart` (1/day, 429 after). Zod-validated responses via `GoalResponseSchema`.
5. Triggers: `PUT /v1/onboarding` (create v1 with `commitment.committedAt`), `PATCH /v1/me/profile` (new version only when a §4 input key is present; else snapshot refresh), `POST /v1/weight`, workout complete (`CompleteEffects.goal`, injectable like `recompute`), `POST /v1/check-ins`. None of them may fail or slow the main request by more than 30 ms p50 locally.
6. `run-plan-job.ts` / `plan-input.ts`: no change here. AMI-181 wires `kcalHint` into the envelope.
7. Account deletion: extend `assert-account-deletion.ts` for both tables. Update `docs/03-engineering/d1-schema.md` (two rows).
8. `scripts/smoke-goal.mjs` (`smoke:goal`): local seed walk-through of AC 2–4.

## File ownership
`apps/api/src/db/schema/goal.ts`, migration `0021_*` (new) · `apps/api/src/lib/goal/**` (new) · `apps/api/src/services/goal-{store,refresh,read}.ts` (new) · `apps/api/src/routes/goal.ts` (new) · trigger lines in `routes/onboarding.ts`, `routes/weight.ts`, `routes/check-ins.ts`, `routes/me-profile.ts` (AMI-176), `services/workout-complete.ts` · `apps/api/scripts/{assert-account-deletion.ts, smoke-goal.mjs}` · `docs/03-engineering/d1-schema.md` · locks: schema index, `app.ts`, api `package.json`, `_journal.json`.

## Acceptance criteria
1. `db:migrate:local` applies cleanly on a DB that already has 0001–0020.
2. Seed the §3 fixture user (onboarding 2026-11-04, logs through day 35, 10/12 sessions). `GET /v1/goal` returns the AMI-178 fixture numbers, `status: on_track`, `plan.originalEta` 2027-03-06, chart with 6 actual points.
3. `PATCH /v1/me/profile {pace:"aggressive"}` → `plan.version` 2, v1 `superseded`, `startWeightKg` unchanged (82). `PATCH {lifestyleNotes}` → version stays 2.
4. `POST /v1/weight` → same-day snapshot upserted (still one row for the date), ETag changes. Second GET with the old ETag → 200, with the new one → 304.
5. Existing user with no plan → first GET backfills v1 (`reason: backfill`). User who skipped goal weight → `mode: horizon`, `band.expected: null`.
6. Trigger failure (throw inside refresh) is logged and the weight log still returns 201. Account deletion removes both tables' rows.
7. `test:goal`, `test:strength`, `test:account-delete` and typecheck pass. Every query filters `user_id`. Files ≤300 lines.

## Path index
`routes/weight.ts`, `routes/onboarding.ts`, `services/workout-complete.ts` (`CompleteEffects`), `services/strength-read.ts` + `lib/strength/next-target.ts`, `services/plan-loaders.ts` (`loadCurrentPlan`, `defaultFuelTargets`), `services/history-summary.ts` (planned vs missed), `db/schema/{activity,profile,strength}.ts`, `migrations/0020_strength_scores.sql` (style).
