# AMI-181 — GoalContext in every AI port + plan-chat goal impact

**Wave 3** · parallel with AMI-182 · **Depends:** AMI-179 merged · Arch §6

## Why
"Let the AI know all of this." The coach, plan chat, plan generator and chef should all know the goal, the estimate and whether the user is on track, and talk about it honestly.

## Scope
1. `services/goal-context.ts`: `buildGoalContext(db, userId, today) → GoalContext | null` from the active plan + today's snapshot (uses `goal-read`, no recompute if a fresh snapshot exists). `line` builder in `services/goal-copy.ts` (also heuristic templates for coach/reviser).
2. Envelope (`services/personalization-context.ts`, `adapters/d1-personalization-context.ts`): per-feature fields from §6 table. Stable fields in `profile` (hashed), volatile in `currentState`. `recipe_chat` gets the weight-free line only.
3. Plan generator: OpenAI system prompt adds the kcal rule ("summary.kcalTarget within ±10 % of profile.goalKcalHint when present") + `GOAL_PROMPT_RULES`. Heuristic generator uses `goalKcalHint` when present (else `sexBand`).
4. Coach: `CoachAdviseInput.goal?`; `routes/coach.ts` builds it; OpenAI + heuristic adapters use it. `PersonalDayContext.goal` + `goal.line` appended to `briefing` (feeds insights, today-actions, voice cue).
5. Plan reviser: `PlanReviseInput.goal?`; `services/revise/goal-impact.ts` (deterministic §6 rules) → `CoachReviseResponse.goalImpact` (contracts `coach-diff.ts`, optional, nullable). Reviser AI may only quote `goalImpact.line` for dates.
6. Meal plan generator + chef (`RecipeChatPort`): pass the envelope fields; append `GOAL_PROMPT_RULES`.
7. Tests: extend `scripts/assert-personalization-context.ts` (`test:context`) per §6 "Tests"; new `scripts/assert-goal-impact.ts` (`test:goal-impact`) for the impact lines; `test:chat-quality` still passes.

## File ownership
`apps/api/src/services/{goal-context,goal-copy}.ts` (new), `services/revise/goal-impact.ts` (new), `services/personalization-context.ts`, `services/personal-context.ts`, `services/revise/context.ts`, `services/plan-revise.ts` (response field), `routes/coach.ts` · `apps/api/src/ports/{coach-advisor,plan-reviser}.ts` (optional `goal` field) · adapters: `openai-/heuristic-{coach-advisor,plan-generator,plan-reviser,meal-plan-generator,recipe-chat}.ts` (prompt/context lines only) · `packages/contracts/src/{coach-diff.ts, insights types}` (optional fields) · `apps/api/scripts/{assert-personalization-context,assert-goal-impact}.ts` · lock: api `package.json`.

## Acceptance criteria
1. `npm run test:context` passes with the new cases: goal fields present per feature; `contextHash` unchanged when only status/trend/ETA change and changed when target or pace changes; recipe line has no "kg"/"lb"; every adapter system prompt includes `GOAL_PROMPT_RULES`.
2. Fixture user (AMI-179 seed, day 35): `/v1/insights/today` briefing ends with "Goal 82→75 kg · trend 79.6 · on track · around Feb 18 (Feb 11–Mar 6)". Coach advise (OpenAI, local key) mentions at most one date, and it is Feb 18. Heuristic advise for a `behind` user names one action and contains no banned word.
3. Plan chat "swap my lunch for a burger" on the fixture → `goalImpact.line` is either "Keeps you on track for around Feb 18" or the over-target sentence, with the real kcal delta. "Change my sessions to 30 min" → `etaDeltaDays` computed, not null. No goal → `goalImpact: null`.
4. Plan generate for the fixture → `summary.kcalTarget` within ±10 % of 2,257 (both adapters).
5. Older mobile builds ignore the new optional fields (contracts parse old payloads). Typecheck, lint, all `test:*` pass. Files ≤300 lines.

## Path index
`services/personalization-context.ts`, `services/personal-context.ts`, `routes/{coach,insights}.ts`, `ports/*.ts`, `adapters/openai-*.ts`, `services/revise/*`, `docs/03-engineering/ai-context-and-credits-architecture.md` §A (field budget), `scripts/assert-personalization-context.ts`.
