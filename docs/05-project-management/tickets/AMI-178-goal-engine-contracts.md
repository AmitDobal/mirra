# AMI-178 — Goal projection engine + contracts (shared, pure)

**Wave 1** · no parallel peers · **Depends:** none · Arch `docs/03-engineering/goal-timeline.md` §0–§3, §5 (contracts only)

## Why
Users need to see roughly when they reach their goal, both in onboarding (before auth, offline) and later from their real logs. One deterministic engine serves both, so the date shown in onboarding is the date the server stores.

## Scope
1. `packages/contracts/src/goal-engine/{rates,simulate,trend,adherence,project,milestones,status,index}.ts`. These are pure TS: no I/O, no `Date.now()` (`today` is an argument), no Zod parsing inside loops. `ENGINE_VERSION = "goal-2026.11-v1"`.
   - `rates.ts`: §2 table, clamps (`minor_pace`, `target_below_healthy`, `kcal_floor`, `beyond_horizon`), Mifflin-St Jeor BMR, activity factor, `kcalHint`.
   - `simulate.ts`: weekly stepper (§3), fractional last week, 104-week cap, returns points + weeks.
   - `trend.ts`: time-aware EWMA (`α = 1 − 0.9^Δdays`), 28-day least-squares slope, validity (≥3 logs over ≥14 days, ignore logs before start).
   - `adherence.ts`: components + per-goal weights + renormalization + `M(A)`.
   - `project.ts`: `projectGoal(input) → GoalProjection` (band, whatIf, chart series, flags, planned line). `previewGoal(onboardingAnswers, today)` for onboarding (no logs).
   - `milestones.ts`, `status.ts` per §3 tables. Strength milestone takes an optional `{label, detail, sessions, perWeek}` input; the engine never imports the strength lib.
2. `packages/contracts/src/goal.ts`: Zod schemas from §5 (`GoalTypeSchema`, `GoalStatusSchema`, `GoalFlagSchema`, `GoalBandSchema`, `GoalMilestoneSchema`, `GoalChartSchema`, `GoalResponseSchema`, `GoalContextSchema` from §6) + `toGoalType(primaryGoal)`.
3. `packages/contracts/src/goal-prompt.ts`: `GOAL_PROMPT_RULES` string (§6 rules 1–5) and `BANNED_GOAL_WORDS`.
4. `onboarding.ts`: `OnboardingBodySchema` gains `commitment: z.object({ committedAt: z.number().int() }).nullable().optional()`. Old clients still validate.
5. `apps/api/scripts/assert-goal.ts` → `npm run test:goal -w @mirra/api` (≥40 assertions).

## File ownership
`packages/contracts/src/goal-engine/**` (new), `goal.ts`, `goal-prompt.ts` (new), `onboarding.ts` (one optional field) · `apps/api/scripts/assert-goal.ts` (new) · locks: contracts `index.ts`, api `package.json` scripts.

## Acceptance criteria
1. Fixture `goal-82-75-steady` (§3 worked example) reproduces exactly: day 0 rates 0.49/0.42/0.30 kg/wk, expected 2027-03-06, range 2027-02-16 → 2027-04-26, whatIf 2027-02-16, milestones first change ~2026-12-16, halfway ~2027-01-03, 5 % ~2027-01-13. Day 35 with the fixture logs: `on_track`, expected 2027-02-18 ±1 day, range 2027-02-11 → 2027-03-06 ±1 day.
2. Asserts cover: aggressive → steady when age 17; BMI clamp with height 180 and target 55 kg; kcal floor binds for female 50 kg / 155 cm / aggressive; `beyond_horizon` for 0.25 kg/wk over 40 kg; `hold` band status; gain table per experience; `direction_mismatch`; `trend_reversed` after 21 days of gain on a cut; whatIf hidden when <7 days earlier; strength milestone date from sessions/perWeek; general_fitness 14/30/66; missing age/height → `kcalHint: null`; horizon mode with no goal weight.
3. Determinism: same input twice gives deep-equal output; no `Date` construction from the wall clock (grep check in the assert).
4. `npm run typecheck` passes for contracts, api and mobile. All files ≤300 lines (prefer 250).

## Path index
`packages/contracts/src/{onboarding,weight,strength}.ts`, `apps/api/src/lib/plan-tuning.ts` (`sexBand`), `apps/api/src/lib/strength/next-target.ts` (input shape for the strength milestone), `apps/api/scripts/assert-strength.ts` (assert style).
