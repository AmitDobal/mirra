# Chef / recipe chat (AMI-127)

One thread per planned meal (`meal_plan_items.id`). Tables: `recipe_chat_threads`, `recipe_chat_turns` (migration `0010`). Deleting the meal deletes its thread.

## Routes (all `requireAuth`)

| Route | Cost | Notes |
| --- | --- | --- |
| `GET /v1/recipe/:mealId` | free | Cached AI recipe if current, else template from the planned items. Returns thread + last 30 turns. |
| `POST /v1/recipe/:mealId/generate` | `recipe_gen` (2) | Cached per (envelope hash, item `updatedAt`). Re-reads cost 0. Ingredients always come from the meal, the model writes steps only. |
| `POST /v1/recipe/chat` | `chef_chat` (1) | Body `{ mealId, message, clientRequestId? }`. Same id replays the stored reply for 0. |

`x-mirra-ai-mode: heuristic` forces the free path.

## Pipeline (cheap checks first, credits last)

404 ownership, replay, `409 thread_capped` (8 turns, `RECIPE_CHAT_MAX_TURNS`), `429` (6/min, `RECIPE_CHAT_RATE_PER_MIN`), scope guard, `422 constraint_violation`, claim turn, `withAiCredits` reserve, model (max 500 output tokens, 45 s abort), post-validate (1 repair, then heuristic), settle, persist.

## Guardrails

- Hard constraints come only from `PersonalizationContextPort` (`feature: "recipe_chat"`). `services/recipe-safety-policy.ts` checks them before the model (user asks to add a banned food) and after it (reply or steps name a banned food or a food outside the user's cuisine).
- `services/recipe-chat-guard.ts`: prompt injection, medical advice, extreme diets (under 1350 kcal a day), off-topic. A hit answers with a fixed redirect, costs 0, uses no turn.
- Max message 500 chars, last 6 turns in the prompt, `sanitizeAiCopy` on replies.
- Credits: heuristic or fallback replies never reserve (hold is released). `402 ai_credits_exhausted` only in `AI_CREDITS_MODE=enforce`. History stays readable; the free path still works.

## Ports and adapters

`ports/recipe-chat.ts` (`RecipeChatPort`), `adapters/openai-recipe-chat.ts`, `adapters/heuristic-recipe-chat.ts`, factory `lib/recipe-chat.ts`. OpenAI is never called from routes or UI. `OPENAI_BASE_URL` points the adapter at a mock for smoke.

## Tests

- `npm run test:chef -w @mirra/api` (policy + guard, offline).
- `node apps/api/scripts/smoke-chef.mjs` (needs `.dev.vars`: mock OpenAI base, `AI_CREDITS_MODE=enforce`, `AI_CREDITS_FREE_GRANT=6`, `RECIPE_CHAT_RATE_PER_MIN=60`).

## Not shipped yet

"Apply to plan" substitution button and structured `RecipeIntent` mutations, streaming, summary compaction, Chef-chat cleanup cron, AiLimitSheet shared with other features.
