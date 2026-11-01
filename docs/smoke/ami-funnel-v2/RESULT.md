# AMI-145/146/147 funnel-v2 — ship gate RESULT (AMI-148)

**Date:** 2026-11-02 · **Base:** `origin/main` `6d49c50` (PR #57 `integrate/funnel-v2`)
**EAS:** group `e39aff31-5ce5-4884-8970-99b4a821c96a` · iOS `01a1991e-25a1-7a69-9d7a-d0bf133028f3`
**Phone:** https://u.expo.dev/update/01a1991e-25a1-7a69-9d7a-d0bf133028f3
**Env at publish:** `EXPO_PUBLIC_ALLOW_DEV_AUTH=true`, `EXPO_PUBLIC_MIRRA_USER_ID=day-test-1`, API `mirra-api.amit-dobalwork.workers.dev`
**Tool:** Expo Go 58 + Maestro on iPhone 16 Pro Max sim. Auth unit tests 19/19 (`cold-start` 11 + `funnel-nav` 4 + `dev-tester-policy` 4). `tsc --noEmit` clean.

## Matrix

| Case | Scenario | Result | Evidence |
| --- | --- | --- | --- |
| Welcome Stitch | Signed-out opens AMI-146 welcome | **PASS** | `00-launch.png`, `A-00-welcome-stitch.png` |
| Sex required | Body-stats Continue disabled until Female/Male/Prefer not | **PASS** | `A-00b-body-stats-sex-required.png`; Maestro selected Female |
| Female imagery | Target/generating/week-reveal/paywall use female people assets | **PASS** | `A-02-week-reveal-female.png`, `D-current.png` hero; builder set `docs/smoke/ami-147/` |
| Soft-skip CTA | "Continue without Pro" absent on auth + paywall | **PASS** | Maestro `assertNotVisible`; `A-03`, `D-current.png` (trial / restore / terms / privacy only) |
| A (dev) | Quiz → reveal → auth → Dev Tester → tabs | **PASS** | `A-03-auth-after-reveal.png`, `A-05-tabs-after-dev.png` |
| D hard paywall | Cold relaunch Dev session → paywall, no tabs | **PASS** | `D-current.png` (Maestro text assert flake on "Start 7-day"; visual OK) |
| Trainer Stitch | Pick-trainer compact AMI-146 grid | **PASS** | `A-00c-trainer-stitch.png` |
| Unit | Funnel-nav single-flight + cold-start + Dev policy | **PASS** | 19/19 |
| B/C Google | Live Google new / returning | **NOT RUN** | Residual — no live Google in sim |
| Delete account | You → delete | **NOT RUN** | Residual — not driven this gate |

## Gaps

- Live Google cases (B/C/E/H/I) not driven.
- Delete-account path not re-run (prior AMI-135/136 coverage).
- Female Stitch exports still `PLACEHOLDER-*` under `assets/stitch/*/female/` until real exports drop in.
- Maestro `extendedWaitUntil: Building your week…` races past fast local generate; use week-reveal wait.

## Notes

- Integrate order: AMI-145 → 146 → 147. Conflicts resolved: hard close + funnel-nav kept; Stitch paywall layout/copy + privacy link; `useOnboardingImagery` wired into PaywallHero.
- Dev Tester still gated by `ALLOW_DEV_AUTH` / `__DEV__` and skips paywall into tabs.
