# AMI-143 funnel gates — result (2026-11-02)

Branch `feat/ami-143-funnel-gates`. Evidence here is **automated only** (pure resolver
`node --test`, `tsc`). No simulator / device run was done in this pass: rows marked
**needs device** still need a Mirra smoke on a clean `origin/main` worktree.

| # | Scenario | Automated | Device smoke |
| --- | --- | --- | --- |
| A | Fresh → quiz → generate → reveal → Google → paywall → tabs | PASS (resolver: reveal → auth → `revealSeen` → paywall) | needs device |
| B | Welcome → I already have an account → new Google | PASS → `/(onboarding)/goal`, never tabs | needs device |
| C | Returning onboarded + entitled | PASS → Today | needs device |
| D | Returning onboarded, not entitled | PASS → paywall | needs device |
| E | Session, `onboardingCompleted` false | PASS → welcome (reveal if plan); auth skipped (mount + reveal Start) | needs device |
| F | Cold start session + onboarded + entitled | PASS → Today (+ `/v1/me`) | needs device |
| G | Session + plan generated, funnel not complete | PASS → week-reveal | needs device |
| H | Paywall close, no entitlement (prod) | PASS guard → paywall; X shows alert, skip button hidden | needs device |
| I | Delete account | Wipe resets onboarding+entitlement stores, session → welcome; next Google = B (resolver PASS) | needs device |
| J | Exercise shows AI week | NOT in this ticket (Exercise plan connection ticket) | — |

Files: `resolver-tests.txt`, `typecheck.txt`.
