# AMI-152 smoke — paywall Restore actually restores

**Branch:** `feat/ami-152-paywall-restore` off `origin/main` `9b84861`
**Tool:** Expo Go on iPhone 16 Pro Max sim, Metro from this worktree, prod API, dev session `day-test-1` (stub purchases).
**Checks:** `node --test` (post-auth-intent + restore-flow): 9/9 pass. `tsc --noEmit`: only the pre-existing `PaywallHero` `absoluteFillObject` error.

| Item | Result | Evidence |
| --- | --- | --- |
| Restore resume after auth (no 2nd tap) | **PASS (seeded)** | `03-restore-resume-no-purchases-alert.png` — paywall mounted with the resume flag armed (temp env seed, removed before commit) → restore ran on its own. |
| Empty / stub `ok` does not unlock | **PASS** | Same shot: stub returns no `pro` entitlement → "No purchases found" alert, stays on paywall (no `finishPro`). Unit: `restore-flow.test.ts`. |
| `pro` entitlement required before `finishPro` | **PASS (unit)** | `classifyRestore` returns `pro` only when `activeEntitlements` has `pro`. |
| RC `logIn` before restore when session exists | **PASS (unit)** | `restoreWithLogin` order test: `logIn:u1` → `restore`; failed logIn skips restore. |
| Error surfacing | **PASS (code/unit)** | Restore error → Alert "Couldn't restore purchases"; purchase errors (non-cancel) render inline above the CTA. Not triggered live (stub never errors). |
| Signed-out Restore → auth with `restore` intent | **PASS (code)** | `setPostAuthIntent("restore")`; `finishAfterAuth` treats it like `paywall` and arms resume only if dest is paywall. Sim tap automation was unavailable, not tapped. |
| Live Google + real RevenueCat sandbox restore | **NOT RUN** | No automatable Google OAuth / sandbox Apple ID in the sim. |
