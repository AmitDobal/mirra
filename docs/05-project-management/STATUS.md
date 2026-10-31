# STATUS

**Latest:** Tab UI restore **merged** PR #17 (`ccc28c8`). Light smoke `/tmp/mirra-qa/restore-all-screens/`. Full-smoke+EAS pending. Weight + AI usage on prod API. EAS day-test republished: [update ad37ef04](https://expo.dev/accounts/amitdobal141/projects/mirra/updates/ad37ef04-61bc-4478-b9d3-d3e9c51d6c39) · iOS manifest https://u.expo.dev/update/01a1937c-5804-715c-ae52-6990b300d08a · evidence `/tmp/mirra-qa/full-smoke-20261101004921`.

| | |
| --- | --- |
| Product | Mirra |
| State | **DAY-TEST LIVE** — hosted API + EAS Update (laptop-off Expo Go) |
| Repo | `/Users/vasusethia/Documents/projects/mirra` |
| Remote | https://github.com/AmitDobal/mirra |
| API | https://mirra-api.amit-dobalwork.workers.dev |
| Mobile | Expo SDK **58** (Expo Go 58) |
| Mobile day-test | Expo Go → [updates](https://expo.dev/accounts/amitdobal141/projects/mirra/updates) (`day-test` channel) |
| Local | API `:8787` · `npm run mobile` |
| UI SoT | `stitch_mirra_ai_personal_trainer/` |
| Smoke | `docs/05-project-management/SMOKE.md` |
| Day-test runbook | `docs/09-runbooks/ios-day-test.md` |

## Evidence (goal)

| Gate | Result |
| --- | --- |
| Mobile + API typecheck | PASS (re-verified) |
| Curl E2E | PASS — [Tester smoke Mirra app](ffde98c0-4dea-47fd-8087-6ee3afbbb96f) |
| Routes onboarding/tabs/workout | PASS |
| `expo export` ios | PASS |
| Integrate | [Integrate API purchases assets](d25fc8cc-2608-48b8-8c82-e40f2327e5cd) |

## Merge queue (merged to `main` 2026-10-31)

| PR | Scope | Linear |
| --- | --- | --- |
| [#1](https://github.com/AmitDobal/mirra/pull/1) | Wave 0 cuisine/prefs P0s | n/a |
| [#2](https://github.com/AmitDobal/mirra/pull/2) | Presence dots + day history (`0008`) | AMI-124 |
| [#3](https://github.com/AmitDobal/mirra/pull/3) | AI credits core (`0009`) | AMI-125 |
| [#4](https://github.com/AmitDobal/mirra/pull/4) | PersonalizationContextPort | AMI-122 |
| [#7](https://github.com/AmitDobal/mirra/pull/7) | Sex default `prefer_not` | AMI-126 |
| [#8](https://github.com/AmitDobal/mirra/pull/8) | Meal detail sheet + Chef chat (`0010`) | AMI-127 |
| [#5](https://github.com/AmitDobal/mirra/pull/5) | `sx()` arbitrary px radii | n/a |
| [#6](https://github.com/AmitDobal/mirra/pull/6) | S12 week-reveal Stitch parity | AMI-123 |

Branches #3, #4, #7, #8, #6 were rebased onto `main` (barrel-export conflicts only) and force-pushed with lease. Next: testers run smoke on `main`.

## Run

```bash
npm run api:dev
npm run mobile
```

## Post-goal polish (not blocking)

- Pixel QA every screen vs Stitch
- Live Better Auth / RevenueCat keys
- S11/S24 screen.png re-export
- Reduce remaining mock chrome on secondary tabs

Updated 2026-10-31.
