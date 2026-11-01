# Onboarding funnel (auth before paywall)

Canonical path after personalization:

`… → mirror → generating → week-reveal → auth (Save your plan) → paywall → tabs`

Motivation peaks after the plan is visible. Guests see value first; Google secures prefs to D1; purchase still requires Google (`requireSignedInUser`). Soft skip paywall is OK once signed in (Google or Dev Tester).

## Durable flags

| Flag | When set | Cold start |
| --- | --- | --- |
| `plan_generated_at` | After generate / `saveOnboarding` | Resume **week-reveal** (never Today alone) |
| `onboarding_completed_at` | After paywall soft finish / purchase / free skip post-auth | **Today** (needs session) |

Do **not** treat plan generate as funnel-complete.

## Auth screen (mandatory signup)

Week-reveal CTA sets `postAuthIntent: "paywall"` before auth.

| Control | Behavior when `postAuthIntent === "paywall"` |
| --- | --- |
| **Continue with Google** (or existing Google session) | Only path to **paywall** |
| **Not now** | Alert only (“Sign in to continue” / choose Google). Does **not** call Dev Tester, does **not** open paywall, does **not** enter tabs |
| **Day-test Dev Tester** (`__DEV__` / `ALLOW_DEV_AUTH`) | Completes funnel → **free tabs**. Never opens paywall on this intent. Labeled clearly as day-test / free |

Outside day-test builds, hide Dev Tester. Not now never bypasses Google for the save-plan step.

## Meal plan deferral

| When | Meal generate (`POST /v1/meal-plan/generate`) |
| --- | --- |
| Week-reveal | **Never.** UI shows a static teaser card (diet / cuisine / avoid chips from onboarding store). No buy/pay copy. |
| Guest / Not now / unsigned | **Blocked** in `meal-plan-store.generate` |
| Dev Tester free tabs | Funnel may be complete, but **not** Google → still **blocked** |
| Google + `onboarding_completed_at` (paywall soft finish or purchase) | Allowed. Fuel CTA works. `ensureAfterOnboarding` auto-generates once on first Today/Fuel if no plan yet |

Gate: `canGenerateMealPlan` = `requireSignedInUser()` **and** funnel completed (Zustand `completed` or SQLite `onboarding_completed_at`).

## Scenarios

| Scenario | Behavior |
| --- | --- |
| **Guest** | Quiz → generating → week-reveal (meal teaser, no meal API) → auth → Google → re-PUT `/v1/onboarding` → paywall → soft skip or buy → tabs → meal generate on Fuel/Today |
| **Returning Google mid-onboarding** | Session + `plan_generated`, not completed → week-reveal; CTA skips auth → paywall (or tabs if Pro) |
| **Already logged-in at week-reveal / auth** | Auth screen auto-continues; week-reveal CTA jumps to paywall (Pro → tabs) |
| **Dev Tester** (day-test / `__DEV__`) | Auth → **free tabs** (skips paywall when intent was paywall). `canSoftSkipPaywall` still true if they hit paywall another way. Purchase blocked for Dev. Meal generate stays off until Google. |
| **Logout** | `clearSession` + onboarding reset → welcome; prefs remain under old user id until next Google |

## Purchase gate

- Soft skip / continue without Pro: `canSoftSkipPaywall()` (Google or Dev).
- Trial / restore: `requireSignedInUser()` only; else route to auth with `postAuthIntent: "paywall"`.

## Post-Google sync

`syncPersonalizationAfterAuth` after `setGoogleSession`: local persist + PUT `/v1/onboarding`, then ensure cloud plan if missing.
