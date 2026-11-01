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

## Scenarios

| Scenario | Behavior |
| --- | --- |
| **Guest** | Quiz → generating → week-reveal → auth → Google → re-PUT `/v1/onboarding` → paywall → soft skip or buy → tabs |
| **Returning Google mid-onboarding** | Session + `plan_generated`, not completed → week-reveal; CTA skips auth → paywall (or tabs if Pro) |
| **Already logged-in at week-reveal / auth** | Auth screen auto-continues; week-reveal CTA jumps to paywall (Pro → tabs) |
| **Dev Tester** (day-test / `__DEV__`) | Auth → paywall; `canSoftSkipPaywall` → free tabs (no Pro claim). Purchase still blocked for Dev. |
| **Logout** | `clearSession` + onboarding reset → welcome; prefs remain under old user id until next Google |

## Purchase gate

- Soft skip / continue without Pro: `canSoftSkipPaywall()` (Google or Dev).
- Trial / restore: `requireSignedInUser()` only; else route to auth with `postAuthIntent: "paywall"`.

## Post-Google sync

`syncPersonalizationAfterAuth` after `setGoogleSession`: local persist + PUT `/v1/onboarding`, then ensure cloud plan if missing.
