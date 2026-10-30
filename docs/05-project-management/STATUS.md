# STATUS

| | |
| --- | --- |
| Product | Mirra |
| State | **DAY-TEST LIVE** — hosted API + EAS Update (laptop-off Expo Go) |
| Repo | `/Users/vasusethia/Documents/projects/mirra` |
| Remote | https://github.com/AmitDobal/mirra |
| API | https://mirra-api.amit-dobalwork.workers.dev |
| Mobile day-test | Expo Go → [update](https://expo.dev/accounts/amitdobal141/projects/mirra/updates/4d10a299-539e-4f9e-bd33-32c6fdc70546) (`day-test` channel) |
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
