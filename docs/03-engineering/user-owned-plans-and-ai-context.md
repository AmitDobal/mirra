# User-owned plans + AI context (isolation & layering)

> **Auth note (temporary):** `Dev Tester` / `x-mirra-user-id` is a day-test shortcut only.
> Real signup will bind the Better Auth user id to every D1 row (profile, preferences, trainer persona).
> Mobile local SQLite `reassignLocalUser` already maps device rows from `local` to the signed-in id.
> Trainer persona lives on `preferences.trainer_persona` (default `drill`) and follows the same user id.
> Remove the dev header (`ALLOW_DEV_USER_HEADER`) before production.

## Isolation (hard rule)

- Every D1 read/write filters `user_id = session.userId` (or `x-mirra-user-id` in day-test only).
- Local SQLite rows are keyed by `getLocalUserId()`; AI cache keys are `${userId}:${logicalKey}`.
- AI prompts receive **only** that user’s personal pack. Never load another user’s meals/plans/sessions into context.
- Smoke: two users A/B — B cannot GET/PATCH/DELETE A’s meals, weight, plan, check-ins.

## Context pack (token-cheap)

`buildPersonalDayContext` (+ tenure) feeds coach / revise / insights:

| Field | Source |
| --- | --- |
| `joinedAt` / `tenureDays` | `users.createdAt` |
| `historySummary` | Rolling window: **7d** default; expand to **14d** if tenure≥14, **21d** if tenure≥21 (still compact text) |
| `history` stats | Same window |
| Today fuel / training / check-in / weight | Existing |

No raw meal lists in LLM prompts.

## Layering: AI generate ↔ user CRUD

1. **AI** can generate / revise meal day + workouts (`/v1/meal-plan/generate`, `/v1/coach/revise`, `/v1/plans/generate`).
2. **User** can create / edit / delete without AI:
   - Logged meals: `PATCH/DELETE /v1/meals/:id`
   - Planned day items: `POST/PATCH/DELETE /v1/meal-plan/items`
   - Workout exercises: `PATCH/DELETE /v1/workouts/:workoutId/exercises/:exerciseId`, `POST .../exercises`
3. UI: edit affordances next to AI badges; manual paths never call the LLM.

## AI response style

Shared `sanitizeAiCopy(text)`:

- Replace em dash / en dash with `. ` or `, `
- Remove bare `;` (split into sentences or use `.`)
- Trim excess whitespace

Applied to coach `message`, revise `reply`, meal-estimate titles if model-authored.

## Mood / intent pills

Coach advise (and plan-chat when present) may return `pills: { id, label, tone }[]` derived from scenario + readiness (deterministic, not a second LLM call). Mobile renders as tappable chips that set readiness/vector or open Fuel/Today.

## Scenario matrix

See `docs/06-knowledge-base/user-tenure-scenarios.md` + `apps/api/scripts/smoke-isolation-tenure.mjs`.
