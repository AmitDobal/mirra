# STATUS

**Latest:** EAS **`01a1989c`** (AMI-139/140 check-in S20b + Today S15b @ `60a5f0a`). Phone: https://u.expo.dev/update/01a1989c-87e3-7f14-948b-359d87fe0f1b. Prior: `01a1966b` (#53+#54). Matrix `/tmp/mirra-qa/onboarding-conversion-smoke/RESULT.md`. API still **`141fd02`**.

| | |
| --- | --- |
| Product | Mirra |
| State | **DAY-TEST LIVE** — hosted API + EAS Update (laptop-off Expo Go) |
| Repo | `/Users/vasusethia/Documents/projects/mirra` |
| Remote | https://github.com/AmitDobal/mirra |
| API | https://mirra-api.amit-dobalwork.workers.dev — **`141fd02` (#49) deployed** |
| Mobile | Expo SDK **58** — EAS **`01a1989c`** (AMI-139/140 @ `60a5f0a`) |
| Mobile day-test | https://u.expo.dev/update/01a1989c-87e3-7f14-948b-359d87fe0f1b · [updates](https://expo.dev/accounts/amitdobal141/projects/mirra/updates) (`day-test`) |
| Local | API `:8787` · `npm run mobile` |
| UI SoT | `stitch_mirra_ai_personal_trainer/` |
| Smoke | `docs/05-project-management/SMOKE.md` |
| Day-test runbook | `docs/09-runbooks/ios-day-test.md` |

## 2026-11-01 — User-base session + You (#34/#35)

| | |
| --- | --- |
| Verdict | **PASS** (API + sim smoke); device reopen **pending** |
| PRs | [#34](https://github.com/AmitDobal/mirra/pull/34) session/hydrate · [#35](https://github.com/AmitDobal/mirra/pull/35) You from `/v1/me` |
| API | `GET /v1/me` → user + linked accounts (D1 `users` / `accounts`) |
| Mobile | Hydrate + cold-start → Today; You profile from API; sign-out clears local session |
| EAS | https://u.expo.dev/update/01a195bd-58de-73a6-9e7d-5c25cf639aab |
| Evidence | `/tmp/mirra-qa/user-base-e2e/` |
| Open | Prove app **reopen** on physical device after kill |

## 2026-11-01 — Restore smoke PASS + EAS

| | |
| --- | --- |
| Verdict | **PASS** — tabs sx (#17) + insights/actions/voice API (#20/#21) on prod |
| Main tip | `3289337` |
| API | insights/today, today/actions, voice/cue/today → 200 |
| Shots | `/tmp/mirra-qa/restore-all-screens/{today,fuel,coach,progress,you}.png` |
| EAS | https://expo.dev/accounts/amitdobal141/projects/mirra/updates/9a0ad4fd-3fbd-4524-8a74-461ccf2e522d |
| iOS manifest | https://u.expo.dev/update/01a19399-461a-759c-9338-f1ea1c1a2170 |

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

Updated 2026-11-01 (user-base #34/#35 + EAS `01a195bd`).
