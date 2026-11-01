# Auth · onboarding · paywall gates (2026-11-02)

## Desired product rules

1. **No app tabs** until all of: **session** (Google or equivalent) · **onboarding funnel complete** · **entitled** (trial or paid). Hard paywall: no **Continue without Pro** CTA. Day-test bypass = **Dev Tester** on auth only (`finishAfterAuth("dev")`).
2. **Login with no prior account** (e.g. “I already have an account” → Google): create account, then run **full onboarding quiz → generate → week reveal → paywall**. Do **not** dump into Today.
3. **Already signed in** during onboarding: **skip signup/auth screen**; advance to next incomplete step (generate / week reveal / paywall).
4. **Server truth**: cold start and tab guards must consult `GET /v1/me` (`onboardingCompleted`, entitlement), not only local SQLite flags.
5. **Do not** overwrite an existing user’s prefs with empty quiz defaults on login (`syncPersonalizationAfterAuth` must no-op when server already has prefs/onboarding).
6. **Plan**: after auth or generate, mirror server week plan into local SQLite; Exercise hub reads `useTodayStore` / plans API (already), must show that plan’s sessions.

## Edge-case matrix (must PASS)

| # | Scenario | Expected |
| --- | --- | --- |
| A | Fresh install → Continue → quiz → generate → week reveal → Google → paywall → tabs | Full funnel; auth once after reveal |
| B | Welcome → Already have account → Google **new** user | Account created → **onboarding start** (skip auth UI later); never Today until B+paywall |
| C | Welcome → Already have account → Google **returning** onboarded+entitled | → tabs |
| D | Returning onboarded, not entitled | → paywall only; no tabs until trial/purchase |
| E | Session exists, `onboardingCompleted` false | Resume quiz/generate/reveal; **skip auth** |
| F | Session + onboarded + entitled, cold start | → Today |
| G | Session + plan generated, not marked funnel complete | → week-reveal (or paywall if reveal done) |
| H | Paywall close without entitlement (prod) | Stay on paywall / blocked; no tabs |
| I | Delete account | Wipe local; → welcome; next Google is case B |
| J | Exercise after generate | Hub shows **AI week** sessions for selected day (not empty stub when plan exists) |

## Implementation sketch

- `cold-start-route.ts` + boot: fetch `/v1/me`; resolve destination.
- New or extend `finishAfterAuth`: branch new vs returning via `/v1/me` (no `onboardingCompleted` / no prefs → intent `onboarding`; else paywall or tabs).
- Tab layout redirect guard (session + onboarded + entitled).
- `week-reveal-nav` / `auth.tsx`: skip if session.
- Paywall UI: never show soft-skip; X → auth (no session) or blocked alert (session). Dev soft-skip mark only via Dev Tester.
- Exercise: ensure hydrate from `/v1/plans/current` after funnel; surface week days from plan; fix UTC `isToday` if broken.

## Tickets

- AMI funnel gates (login→onboarding, skip auth, hard paywall, me-based cold start)
- AMI Exercise plan connection (hydrate AI week; smoke workout day)
