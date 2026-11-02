# AMI-151 smoke — Google auth loading overlay + multi-account funnel

**Branch:** `feat/ami-151-google-auth-loading` off `origin/main` `c5acede`
**Tool:** Expo Go 58 on iPhone 16 Pro Max sim (Metro from this worktree) + `curl` against prod API `mirra-api.amit-dobalwork.workers.dev` with a throwaway dev user.
**Checks:** `tsc --noEmit` clean for touched files (one pre-existing local-only `PaywallHero` `absoluteFillObject` typing error from the shared node_modules, untouched); `check-sx` ok.

## Overlay

| Item | Result | Evidence |
| --- | --- | --- |
| S14b reference | ref | `stitch-s14b-375.png` (Stitch screen `5bb7eac53802494d9a246f5c5645f542`) |
| Overlay on auth screen | **PASS (seeded)** | `overlay-ios.png` — scrim over "Save your plan", Live AI pill, lime arc spinner, "Signing you in…", "Stay here — connecting Google securely." Pending was seeded via a temporary env flag + temp index redirect (both removed before commit). |
| Touch / back blocking | **PASS (code)** | `Modal` swallows touches and Android back (`onRequestClose` no-op); back, Apple, Email, Not now, Dev Tester and the Google button are also `disabled` while pending. Not tapped in the sim (pending was seeded, not a live flow). |
| `pending` scope | **PASS (code)** | Lifted to `auth.tsx`; held from tap through authorize-URL fetch, browser return, session read, `setGoogleSession`, and the full `finishAfterAuth` (awaited). Cleared in `finally`/on any error. |

Gap vs Stitch: dropped the "256-bit encrypted credential handshake" chip (unverifiable claim). Native scrim has no backdrop blur.

## Multi-account matrix (prod API, throwaway user `del-ami151-<ts>`, never `day-test-1`)

| Case | Scenario | Result | Evidence |
| --- | --- | --- | --- |
| A | Create account | **PASS (API)** | `GET /v1/me` 200 → user row created, `entitlement.status: none`, `onboardingCompleted: false` |
| B | Paywall for new/unpaid | **PASS (API) / PARTIAL (UI)** | API reports unentitled → funnel resolver routes to paywall (covered by `cold-start-route` unit tests). In Expo Go the cached dev session landed on the paywall, but that screenshot was overwritten, not kept. |
| C | Delete account | **PASS (API)** | `DELETE /v1/me` → `{"ok":true}`; unauth `DELETE` → 401 |
| D | Isolation | **PASS** | `day-test-1` `GET /v1/me` still 200 |
| E | Recreate same id | **PASS (API)** | `GET /v1/me` after delete → fresh row, `profile: null`, `onboardingCompleted: false`, unentitled (back to onboarding/paywall funnel) |
| Live Google | Real Google create/delete/recreate | **NOT RUN** | No automatable Google OAuth in the sim; Computer Use not granted; Maestro not installed. |
| You → Delete UI | In-app delete flow | **NOT RUN** | Same reason; API contract covered above. |

Throwaway user deleted at the end of the run.
