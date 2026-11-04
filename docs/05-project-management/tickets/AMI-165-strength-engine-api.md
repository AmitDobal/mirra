# AMI-165 — Strength engine: standards, scoring lib, D1, endpoints, complete hook

**Wave 2** · parallel with AMI-166, AMI-167 · **Depends:** AMI-161 merged · Arch §1, §4, §5 (0020), §6

## Why
Users need a tier per muscle, per group, per lift and overall, computed from the sets they already log. Every tier also needs a concrete "do this set to rank up" target.

## Scope
1. `packages/contracts/src/strength.ts`: `TierIdSchema`, `TierStandingSchema`, `NextTargetSchema`, `TierChangeSchema`, `StrengthOverviewResponseSchema`, `MuscleStrengthResponseSchema`, `ExerciseStrengthResponseSchema` (§6.5). `workouts.ts`: `WorkoutSessionResponseSchema` gains optional `tierChanges: TierChange[]`.
2. Standards: `data/strength-standards/{male,female,index}.ts` + `scripts/build-standards.ts` (OpenPowerlifting CSV path as an argument; the CSV is not committed; calibration table `GYM_TO_OPL_Q` per §6.1). Commit the generated TS. Add a header comment with the data source + date + `STANDARDS_VERSION`. Fill `standard` numbers for the AMI-161 anchor ids; `parent`/`ratio` stays in the library entries.
3. Pure lib `lib/strength/{tiers,e1rm,percentile,sustain,aggregate,next-target}.ts`. No D1 imports. `scripts/assert-strength.ts` (`test:strength`) covers:
   - step boundaries (0, 9, 20, 21);
   - Epley;
   - bodyweight effective load;
   - percentile interpolation incl. below T5 / above T95;
   - inverse `valueAtPct` round trip;
   - EWMA + 85% floor + hysteresis (2 bad sessions to demote);
   - muscle weighting (involvement <25% ignored);
   - overall unlock (8 lifts / 5 groups);
   - next-target worked examples (load, bodyweight added, bodyweight reps-only, units lb rounding to 5).
4. Migration `0020_strength_scores.sql` + `db/schema/strength.ts` (4 tables §5).
5. `services/strength-recompute.ts` (`recomputeStrengthSafe`): §6.3 incl. lazy canonical backfill via `exercise-resolve`. `services/strength-read.ts` for the 3 GET endpoints. Hook into `routes/workouts.ts` complete: return `tierChanges`.
6. `routes/strength.ts`: `GET /v1/strength`, `/v1/strength/muscles/:muscleId`, `/v1/strength/exercises/:exerciseId`. Bodyweight from the latest weight log, else `profiles.weight_kg`. Sex null/other → mean of cohorts (§6.2).
7. Account deletion: confirm the cascade covers the new tables (extend `assert-account-deletion.ts`).

## File ownership
`packages/contracts/src/strength.ts` (new), `workouts.ts` · `apps/api/src/data/strength-standards/**` (new) · `apps/api/src/lib/strength/**` (new) · `apps/api/src/services/strength-*.ts` (new) · `apps/api/src/routes/strength.ts` (new), `routes/workouts.ts` · `apps/api/src/db/schema/strength.ts`, migration `0020_*` + meta · `apps/api/scripts/{assert-strength,build-standards,assert-account-deletion}.ts` · locks. Read-only: AMI-161 library + resolver.

## Acceptance criteria
1. `npm run test:strength` passes with ≥25 assertions, including the worked example: male 80 kg, bench 80 kg × 8. Show the computed e1RM, pct, label and the next target in the PR body.
2. Local seed: 3 sessions (bench, squat, row, pull-up with +0 kg, plank skipped). `GET /v1/strength` shows ranked muscles for chest/quads/lats etc., unranked core, overall `null` with unlock `{ranked: 4, rankedNeeded: 8}`.
3. Complete a 4th session with a heavier bench → the complete response has `tierChanges` with the exercise and the chest muscle promotion. `strength_events` rows exist.
4. Skipping 30 days and logging one weak session never drops a display step (floor + hysteresis), proven in assert.
5. The complete endpoint stays <150 ms p50 locally with 90 days of seeded sets. Recompute failure is logged and does not fail completion.
6. All files ≤300 lines. Every query filters `user_id`.

## Path index
`apps/api/src/routes/workouts.ts`, `services/workout-stats.ts` (set queries), `services/badges.ts` (award pattern), `services/weight-line.ts`, `db/schema/activity.ts`, `profile.ts`, `docs/01-research/symmetry-muscle-ranks.md` §2.4-2.5.
