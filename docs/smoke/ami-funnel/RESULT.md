# AMI-143/144 funnel gates + Exercise plan — ship gate RESULT

**Date:** 2026-11-02 · **Base:** `origin/main` `97cc841` (bundle built from it; only `apps/mobile/package.json` `update:day-test` script differed, adding the flag)
**EAS:** group `d07aed29-3d38-4f2d-a9aa-83659d5a9e68` · iOS `01a198f6-daa4-7bc7-bf48-ac3f256baade`
**Phone:** https://u.expo.dev/update/01a198f6-daa4-7bc7-bf48-ac3f256baade
**Env at publish:** `EXPO_PUBLIC_ALLOW_DEV_AUTH=true`, `EXPO_PUBLIC_MIRRA_USER_ID=day-test-1`, API `mirra-api.amit-dobalwork.workers.dev`
**Tool:** Expo Go 58 (fresh install) in iPhone 16 Pro Max sim, Maestro + simctl. `tsc --noEmit` clean; `node --test src/lib/auth/*.test.ts` 14/14.

## Matrix

| Case | Scenario | Result | Evidence |
| --- | --- | --- | --- |
| Flag | Dev Tester visible/working in EAS Update (not `__DEV__`) | **PASS** | Soft-skip works in published bundle; `D-02`, `A-05` |
| A (dev) | Fresh → quiz → generate → week reveal → auth → Dev Tester → tabs | **PASS** | `A-03` auth after reveal, `A-05` Today with new plan (Full Body Strength, 5 ex) |
| B | Google **new** user → onboarding | **NOT RUN** | No live Google account in sim. Covered by `cold-start-route.test.ts` |
| C | Google returning onboarded + entitled → tabs | **NOT RUN** | Same. Unit tests only |
| D | Onboarded, not entitled → paywall, no tabs | **PASS** (dev session) | `D-00/D-01` cold launch lands on paywall; `F-cold-restart` after kill+relaunch back on paywall (soft-skip is not persisted) |
| F-ish | Cold start with session, mid-funnel resume | **PASS** | Second quiz run resumed on week-reveal, auth skipped path not needed (no session) |
| G | Signed out cannot reach tabs | **PASS (weak)** | Sign out → welcome (`G`). Deep link `/--/today` while signed out stayed on welcome; Expo Go may not route deep link, so also confirmed in code: `(tabs)/_layout.tsx` `resolveTabGuard` |
| Tab guard | No session / not onboarded / not entitled → redirect, unless soft-skip | **PASS** | Code + unit tests + D/F screens |
| J | Exercise hub shows AI week for selected day | **PASS** | `J-exercise-day-test` (day-test-1, Upper Body Strength, 4 ex); `A-06` (fresh generated plan, Full Body Strength, 5 ex, matches week reveal) |
| Hard prod | Build without flag stays hard-gated | **PASS (unit)** | `dev-tester-policy.test.ts` "prod build without flag stays hard-gated" |

## Gaps

- Cases B, C, E, H, I not driven live (Google OAuth not automatable; delete-account not re-run).
- Switching to another weekday on Exercise (tap "28") not exercised (Maestro selector ambiguous).
- Day strip shows week of Oct 26 with 26 selected while today is Nov 2. Plan week is anchored to the generation week. Not a gate blocker, but check whether the strip should roll to the current week.
- Real App Store build without the flag not built; only policy unit test.

## Notes

- Dev Tester skips the paywall right after the funnel (matches `onboarding-funnel.md`); cold restart shows the paywall with "Continue without Pro" because soft-skip is session-only.
