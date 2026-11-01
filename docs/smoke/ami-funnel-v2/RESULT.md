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

---

## AMI-148 residual (2026-11-02) — `fix/ami-148-residual` off `b7847c0`

**Base:** `origin/main` `b7847c0` · worktree `../mirra-wt-ami-148`

### Google B/C live
| Check | Result |
| --- | --- |
| Expo Go + Maestro live Google OAuth | **BLOCKED** — Maestro CLI not installed; Computer Use needs Accessibility/Screen Recording grant (prompted, not approved this run). Sim Google OAuth historically not automatable (browser/handoff). |
| Unit coverage strengthened | **PASS** — `cold-start-route` 13/13 (welcome signin intent + mid-onboarding Google return); new `post-auth-intent.test.ts` 3/3; funnel-nav + dev-tester still green → **24/24** auth unit suite |

### Delete-account
| Check | Result |
| --- | --- |
| Prod throwaway `DELETE /v1/me` | **PASS** — user `del-ami148-1793570784` (NOT day-test-1): GET 200 → DELETE `{"ok":true}` → unauth DELETE 401; day-test-1 profile still intact |
| Local `npm run test:account-delete` | **SKIP** — fresh worktree D1 has no `users` table (migrations not applied locally); prior AMI-135/136 local assert still authoritative |
| You → Settings UI cold → welcome | **NOT RUN** — Computer Use / Maestro unavailable this residual; API path smoke covers wipe contract |

### Female Stitch assets
| Check | Result |
| --- | --- |
| Export | Stitch `0608cba57d2e45e5a1aaa6091a4e397b` + local `stitch_mirra_ai_personal_trainer/s02_welcome_hook_female/screen.png` |
| Welcome | `s02_welcome_hook_v2` hero + `portrait-woman-athlete` from S02c female runner |
| Paywall | `s13_paywall/female/coach-cutout.jpg` (PLACEHOLDER removed) |
| Other female folders | PLACEHOLDER-* → real filenames (same S02c hero until more gendered exports) |

### Notes
- EAS `update:day-test` required after merge (new mobile assets).
- sx-only; no NativeWind/`className` changes.

### EAS after merge
- Tip `ae8eb1f` · iOS update `01a19929-fe4f-79bc-80f3-a0672644a612` · group `669ed799-4171-4e5e-bafd-4f8732a1f21d`
- Phone: https://u.expo.dev/update/01a19929-fe4f-79bc-80f3-a0672644a612
- Dashboard: https://expo.dev/accounts/amitdobal141/projects/mirra/updates/669ed799-4171-4e5e-bafd-4f8732a1f21d
