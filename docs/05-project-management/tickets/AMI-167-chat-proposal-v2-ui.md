# AMI-167 — Plan-chat proposal v2 UI (S39)

**Wave 2** · parallel with AMI-165, AMI-166 · **Depends:** AMI-163 merged, S39 export approved · Arch §8.1, §8.6

## Why
The card must show the old vs new meal and the old vs new exercise with real names, macros, sets × reps, tags and a "↳" reason line, as in S28/S39. Apply must commit exactly what was shown.

## Scope
1. `lib/api/coach-revise.ts`: send `dryRun:true`, keep `draftId`. Apply = `POST /v1/coach/revise/apply {draftId}`. Handle 409 (`plan_changed`) and 410 (expired).
2. Replace `proposal-rows.ts` with `proposal-model.ts`: group `items` into WORKOUT REVISION / MEAL ADJUSTMENT / SCHEDULE / PLAN PREFERENCES (S39 order). Port + extend `proposal-rows.test.ts` → `proposal-model.test.ts` (one case per item kind).
3. Split `ProposalCard.tsx` (299 lines) into `ProposalCard`, `MealDiffRow`, `ExerciseDiffRow`, `PrefDiffRow`, `ScheduleDiffRow`, `DiffTag`. Each kind renders the exact S39 text pattern:
   - meal: struck "Before: Lunch · Chicken Caesar wrap" + kcal pill; "After: Lunch · Salmon rice bowl" + tag pill; "↳ +12g protein · −20g carbs · 610 kcal";
   - exercise: "Before: Tricep Dips · 3×8-10" / "After: Skull Crusher · 3×8-10" + "↳ reason";
   - pref: "Avoid: chicken" single row (no fake before);
   - schedule: "Thu · Push day" moved from "Tue";
   - session_minutes and meals_per_day: "45 min → 30 min".
4. `plan-chat-store.ts`: holds `draftId`. "Yes, apply" posts it. On 409: assistant bubble "Your plan changed. Send that again?" and the card disables. Falls back to legacy `changes` if `items` is missing (older API).
5. Copy in `src/content/plan-chat.ts` (create if missing).

## File ownership
`apps/mobile/src/features/coach/{ProposalCard,PlanChatScreen,plan-chat-store,proposal-rows,proposal-rows.test}.*` → new split files in `features/coach/proposal/**` · `apps/mobile/src/lib/api/coach-revise.ts` · `apps/mobile/src/content/plan-chat.ts`.

## Acceptance criteria
1. Against local API (AMI-163 merged; AMI-166 optional): "Swap my lunch" shows one meal row with the real new dish name and macros. Apply → Fuel lunch shows the same name.
2. "I don't eat chicken" shows "Avoid: chicken" plus the affected meal swaps.
3. Multi-change message ("swap lunch and replace tricep dips with skull crushers", once AMI-166 lands; otherwise mock JSON fixture) renders both sections with S39 spacing.
4. Screenshots vs `s39_plan_chat_proposal_v2/screen.png` and `s28_plan_chat_proposal/screen.png` in `docs/smoke/ami-167/` (390, SE, Android). Tags are pills; the reason line starts with "↳"; before rows are struck through in `on-surface-variant`.
5. Every file ≤300 lines (ProposalCard ≤150). The test file covers all 10 kinds.

## Path index
`features/coach/*`, `lib/api/coach-revise.ts`, `packages/contracts/src/coach-diff.ts`, Stitch S28 + S39.
