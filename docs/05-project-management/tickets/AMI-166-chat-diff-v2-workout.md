# AMI-166 — Plan-chat v2 workout side: exercise swap/add/remove, schedule move, full_gym fix

**Wave 2** · parallel with AMI-165, AMI-167 · **Depends:** AMI-161, AMI-163 merged · Arch §8.4, §8.5

## Why
"Replace tricep dips with skull crushers" returns "couldn't map". "Prefer bench press" does nothing for full-gym users because `has()` ignores `full_gym` (`workout-revise.ts:74`). There are no schedule edits.

## Scope
1. `services/workout-swaps.ts`: `hasGear(equipment)` with `full_gym` expansion (§8.5). Used everywhere `has()` was.
2. Replace `services/revise/workout-step.ts` (AMI-163's wrapper) with a real draft planner:
   - `intent.exerciseSwaps`: match `from` against the target workout by `normalize` / canonical id (AMI-161). Resolve `to` through the library, so the display name is the canonical name and `canonicalId` is set. Keep sets/reps/rest unless the user stated them; for a new pattern use library defaults.
   - `exerciseAdds` / `exerciseRemoves` (min 2 moves stays).
   - `preferExercises`: generalizes bench. Swap into the same-pattern slot, else add at the top.
   - Gear-loss swaps (existing behavior) keep working.
   - Writes `workout_draft_json`. Apply writes rows incl. `canonical_id`.
3. `services/revise/schedule-step.ts`: `scheduleMoves` → swap `plan_days` workout/kind/label between two dates in the current plan. Only today or later. Refuse days with a logged session (warning naming the day). Writes `schedule_draft_json`. Item `schedule_day_move` with weekday labels.
4. Deterministic exercise tags (`tags.ts` exercise half): "Same muscles" via library muscle overlap + equipment tag. Reason: AI reason or "Trains chest, triceps".
5. No match: warning "No 'tricep dips' in Thu · Push day. Your moves: Incline dumbbell press, Cable fly, Skull crusher". Never an empty preview.
6. `scripts/assert-workout-revise.ts` (`test:workout-revise`).

## File ownership
`apps/api/src/services/workout-revise.ts`, `services/workout-swaps.ts`, `services/revise/workout-step.ts`, `services/revise/schedule-step.ts` (new), `services/revise/tags-exercise.ts` (new; `tags.ts` re-exports it, a one-line edit) · `apps/api/scripts/assert-workout-revise.ts` (new) · lock: api package.json. Read-only: AMI-161 lib, AMI-163 drafts/orchestrator. One-line wiring in `services/revise/orchestrator.ts` is allowed for the schedule step.

## Acceptance criteria
1. "Replace tricep dips with skull crushers" on a plan containing Tricep Dips → one `exercise_swap` with `before {name:"Tricep Dips", sets:3, reps:"8-10"}`, `after {name:"Skull Crusher", sets:3, reps:"8-10", canonicalId:"skull_crusher"}`. Applied workout matches.
2. full_gym user + "prefer bench press" on push day → `exercise_swap` into the push slot (or `exercise_add`), never empty.
3. "Move Tuesday's workout to Thursday" → `schedule_day_move` with fromLabel "Tue", toLabel "Thu". After apply the plan days are swapped. Past day → warning, no item.
4. Heuristic adapter (no OpenAI key) passes cases 1-3.
5. Legacy gear-loss swap regression: removing barbell swaps barbell moves (existing assert still passes).
6. Files ≤300 lines.

## Path index
`apps/api/src/services/workout-revise.ts`, `workout-swaps.ts`, `lib/plan-tuning.ts`, `services/revise/*` (from AMI-163), `db/schema/plans.ts` (`plan_days`), AMI-161 `lib/exercise-library/*`.
