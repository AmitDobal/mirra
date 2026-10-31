# STATUS

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

## Run

```bash
npm run api:dev
npm run mobile
```

## Wave: AI personalization (IN PROGRESS, opened 2026-10-31)

Tickets: `tickets-wave-ai-personalization.md` · Linear project [Mirra AI Personalization](https://linear.app/amitd1/project/mirra-ai-personalization-6eccdbd7aaa7)

| Wave | Ticket | Linear | State |
| --- | --- | --- | --- |
| 1 | F Architecture doc: profile snapshot to AI port | [AMI-122](https://linear.app/amitd1/issue/AMI-122) | Todo |
| 1 | A Week-reveal S12 Stitch parity + smoke shots | [AMI-123](https://linear.app/amitd1/issue/AMI-123) | Todo |
| 1 | C Today week-strip presence dots + day history | [AMI-124](https://linear.app/amitd1/issue/AMI-124) | Todo |
| 1 | E AI credits + gating + referral stub + hard caps | [AMI-125](https://linear.app/amitd1/issue/AMI-125) | Todo |
| 2 | B Persist + feed all onboarding prefs (cuisine hard filter, gender) | [AMI-126](https://linear.app/amitd1/issue/AMI-126) | Backlog (after F) |
| 3 | D Meal detail sheet + Chef/recipe chat | [AMI-127](https://linear.app/amitd1/issue/AMI-127) | Backlog (after B, E) |
| 4 | Testers per surface | n/a | After merges |

Order: F, A, C, E in parallel, then B, then D, then testers. Builders only (no lead, no self-Pass).

## Post-goal polish (not blocking)

- Pixel QA every screen vs Stitch
- Live Better Auth / RevenueCat keys
- S11/S24 screen.png re-export
- Reduce remaining mock chrome on secondary tabs

## AI personalization decisions proposed

- Hybrid typed profile plus provenance-bearing, expiring notes.
- Feature-specific context snapshots; deterministic nutrition, allergy, and plan validation.
- Physiological sex inputs only for named equations; symptom-led, not cycle-phase-led adjustments.
- RevenueCat for entitlement; D1 credit ledger plus strict live reservations; user quotas shown as feature actions.

Updated 2026-10-31 (AI personalization wave opened).
