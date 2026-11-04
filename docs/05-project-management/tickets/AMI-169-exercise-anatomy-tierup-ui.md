# AMI-169 — Exercise detail anatomy v2 + tier card, workout complete tier-up (S36/S38)

**Wave 3** · parallel with AMI-168 · **Depends:** AMI-161, AMI-162, AMI-165 merged; S36, S38 approved · Arch §2.2, §3, §4, §6.4

## Why
Every exercise, including AI-generated ones, must show which muscles it trains on real front/back anatomy, with the user's tier for the lift and the next set to rank up. Finishing a workout must show what tier moved.

## Scope
1. Exercise detail (S36):
   - Anatomy section **above** the steps: front + back `AnatomyPair` in focus mode, legend "Primary · <muscles>" lime / "Secondary · <muscles>" lavender.
   - Muscles come from `PlanExercise.muscles` (plan lifts) or `GET /v1/exercises/:canonicalId` (hub items). Add `canonicalId` to each `content/exercise-catalog.json` entry.
   - Remove the "0% focus" fallback; a lift with no muscle data hides the section.
   - Tier card: TierBadge md + label + progress bar + next target string from `GET /v1/strength/exercises/:id`, or "Unranked lift" when `ranked:false`.
   - Keep `MuscleBars`, fed from the same muscles.
2. `lib/api/strength-exercise.ts` + `lib/api/exercise-library.ts` (new; not `strength.ts`, which AMI-168 owns).
3. Workout complete (S38): when `tierChanges` is non-empty, show the "Tier up" block under the existing stats. List up to 6 rows: badge sm, name, "Silver I → Gold III". The overall change gets a lg badge row first. Haptic success once. Empty → screen unchanged.
4. Live HUD: for `scoring = bodyweight` lifts the weight stepper label reads "+ kg added" (or "+ lb added").
5. `workout-persist.ts`: carry `tierChanges` from the complete response into the store for CompleteScreen.

## File ownership
`apps/mobile/src/features/exercise/{ExerciseDetailScreen,DetailParts,catalog}.ts(x)`, new `features/exercise/ExerciseTierCard.tsx`, `features/exercise/ExerciseAnatomySection.tsx` · `apps/mobile/src/content/exercise-catalog.json` · `apps/mobile/src/features/workout/{CompleteScreen,workout-store,workout-persist,LiveWorkoutScreen,SetStepper}.tsx/ts`, new `features/workout/TierUpList.tsx` · `apps/mobile/src/lib/api/{strength-exercise,exercise-library,workouts}.ts` · lock: lib/api index. Not `features/exercise/body-map/**` (AMI-162 made it the adapter; import only).

## Acceptance criteria
1. AI-plan lifts from the audit (Tricep Dips, Incline Dumbbell Press, etc.) show anatomy with correct primary/secondary. Zero lifts in the seeded plan show "0% focus".
2. Bench detail matches `s36_exercise_anatomy_v2/screen.png`: lime primary, lavender secondary, front + back, section above the steps.
3. Seeded heavier bench session → complete screen lists the bench + chest promotions with badges, matching `s38_workout_complete_tier_up/screen.png`. Session with no change → identical to the current S17 layout.
4. Pull-up HUD shows "+ lb added" for an imperial user.
5. Screenshots in `docs/smoke/ami-169/` (390, SE, Android). Files ≤300 lines; ExerciseDetailScreen stays ≤250.

## Path index
`features/exercise/ExerciseDetailScreen.tsx`, `catalog.ts`, `body-map/ExerciseBodyMap.tsx`, `features/workout/*`, `lib/api/workouts.ts`, `packages/contracts/src/{plans,strength,workouts}.ts`, Stitch S26, S31, S36, S38, S17.
