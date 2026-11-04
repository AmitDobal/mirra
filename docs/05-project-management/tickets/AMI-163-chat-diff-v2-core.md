# AMI-163 — Plan-chat diff v2 core: typed items, drafts, intent v2, real meal previews

**Wave 1** · parallel with AMI-161, AMI-162, AMI-164 · **Depends:** none · Arch §8.1-8.5

## Why
Today the proposal shows "new dish ~870 kcal" placeholders, and real names only appear after apply. "Swap my lunch" rebuilds all 4 meals. "Avoid chicken" renders as "Before: nothing / After: chicken". Changes are free strings with no macros, deltas, tags or reason. The user must see the **real** before and after before committing.

## Scope
1. Contract `packages/contracts/src/coach-diff.ts`: `ReviseItemSchema` discriminated union (all kinds in §8.1, including the exercise and schedule kinds that AMI-166 fills). `MealSnap`, `ExerciseSnap`, `Delta`. `ReviseApplyBodySchema {draftId}`. `coach.ts`: response gains `draftId`, `expiresAt`, `items`. Legacy `changes` stays and is derived from items.
2. Intent v2 in `ports/plan-reviser.ts` + `lib/plan-intent.ts` (`sanitizeIntent` clamps the new fields) + both reviser adapters (OpenAI json schema + heuristic regexes, §8.4). The reviser also receives the target workout's exercises and today's meals with slots (already partly there).
3. Migration `0019_revise_drafts.sql` + `db/schema/revise-drafts.ts` (all columns in §8.3, including `workout_draft_json`, `schedule_draft_json`).
4. Split `services/plan-revise.ts` (255 lines) into `services/revise/`: `orchestrator.ts` (propose), `drafts.ts` (create/load/expire, base hash), `apply.ts` (commit a draft in one `db.batch`), `meal-step.ts`, `prefs-step.ts`, `workout-step.ts`, `tags.ts` (deterministic tags + reason). `plan-revise.ts` becomes a ≤20-line re-export or is removed.
5. `workout-step.ts` in this ticket wraps today's `reviseWorkout(dryRun)` and maps its output to `exercise_swap/add/remove` + `session_minutes` items, with sets × reps from the rows. Apply re-runs it non-dry (today's behavior). AMI-166 replaces this file.
6. Meals: split `services/meal-plan.ts` (343 lines) into `draftMeals(ctx, {date, slots, budgets})` (no writes, uses the `MealPlanGenerator` port) + `commitMealDraft(ctx, draft)`. Slot targeting order: `context.mealItemId`, then `intent.mealSlots`, then open slots only for whole-day asks. Items: `meal_swap` with real names + macros + `delta`. `meals_per_day` produces `meal_add` / `meal_remove`.
7. Prefs: `pref` items with explicit `op` + `label` ("Avoid", "Prefer", "Diet", "Only cuisine", "Add gear", "Remove gear").
8. Routes: `POST /v1/coach/revise` (dryRun → draft) and `POST /v1/coach/revise/apply`. Apply on an expired or applied draft → 410. Changed base → 409 `plan_changed`. Limits as in §8.2 (propose 6/day; apply keeps the AMI-159 caps).
9. Asserts: extend `scripts/assert-meal-revise.ts`, `assert-revise-caps.ts`; add `scripts/assert-revise-drafts.ts` (`test:revise-drafts`).

## File ownership
`packages/contracts/src/coach.ts`, `coach-diff.ts` (new) · `apps/api/src/services/plan-revise.ts`, `services/revise/**` (new), `services/meal-revise.ts`, `services/prefs-revise.ts`, `services/meal-plan.ts` (+ new split files `meal-plan-*.ts` it creates) · `apps/api/src/ports/plan-reviser.ts` · `apps/api/src/adapters/{openai,heuristic}-plan-reviser.ts` · `apps/api/src/lib/plan-intent.ts` · `apps/api/src/routes/coach.ts` · `apps/api/src/db/schema/revise-drafts.ts`, migration `0019_*` + meta · `apps/api/scripts/assert-{meal-revise,revise-caps,revise-drafts}.ts` · locks. **Not** `workout-revise.ts` / `workout-swaps.ts` (AMI-166).

## Acceptance criteria
1. "Swap my lunch" (heuristic and OpenAI) → exactly one `meal_swap` item, slot `lunch`. `after.name` is a real dish name (not "new dish"), with kcal/P/C/F and `delta`. Other slots untouched after apply.
2. The same draft applied → `GET` meal plan lunch title equals the preview `after.name` byte for byte. No AI call on apply (log/usage shows none).
3. "I don't eat chicken" → `pref` item `{op:"avoid", label:"Avoid", items:["chicken"]}` plus `meal_swap` items only for slots that contained chicken.
4. "Two meals a day" → `meals_per_day {before:4, after:2}` + `meal_remove` items naming the dropped dishes.
5. Apply twice → second call 410. Editing the plan between propose and apply → 409.
6. Response still carries legacy `changes[]`, so the current EAS client renders without crashing (smoke with the current mobile build).
7. Every new file ≤300 lines. All `test:*` scripts pass. Copy has no em dashes (sanitizeAiCopy).

## Path index
`apps/api/src/services/plan-revise.ts`, `meal-revise.ts`, `meal-plan.ts`, `meal-plan-draft.ts`, `meal-slots.ts` (lib), `routes/coach.ts`, `adapters/*-plan-reviser.ts`, `packages/contracts/src/coach.ts`, `meal-plan.ts`; Stitch S28 + `stitch/prompts/s39_plan_chat_proposal_v2.md` (data shape it must feed).
