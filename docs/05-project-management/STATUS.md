# STATUS

| | |
| --- | --- |
| Product | Mirra |
| State | **GOAL ACTIVE** — local SQLite + full working flows |
| Repo | `/Users/vasusethia/Documents/projects/mirra` |
| Remote | https://github.com/AmitDobal/mirra |
| Local | API `:8787` · Expo LAN `:8081` · iPhone 16 Pro |
| UI SoT | `stitch_mirra_ai_personal_trainer/` |

## Architecture add

- **Mobile local-first:** `expo-sqlite` for profile/plan/meals/check-ins/sessions (fast UI)
- **API:** Cloudflare Worker D1 remains source of sync / remote (write-through when online)
- Screens must stop using static `mock.ts` for primary actions

## Wave G2 — working product (parallel)

| id | slice | state | path lock |
| --- | --- | --- | --- |
| G2-SQL | expo-sqlite DB + repos + local plan seed | done | [Mobile expo-sqlite local DB](b61bc6df-9113-4ed3-ab12-9ead0189f314) |
| G2-SQL-boot | Call `ensureMirraDb` from root `_layout` | done | [Wire ensureMirraDb in root](9f5364ba-f095-4e37-92e4-3dd6fdf09711) |
| G2-API | Harden API: onboarding, plans, workouts, rebuild | done | [Harden full Mirra API](515057d9-01da-4058-9bb6-0d53311b2bf7) |
| G2-ONB | Wire S01–S14 generate + week reveal | done | [Wire onboarding to SQLite+API](89d420d4-f175-4bae-b559-7ce893991640) |
| G2-ONB-sql | Swap onboarding `memory-store` → `@/db` repos | done | [Onboarding memory→SQLite swap](4c263125-7401-471c-a04d-8ecc9a46af00) |
| G2-HOME | Wire Today/Fuel/Workout/Coach/Progress/You actions | done | [Wire all tab screen actions](2c52e764-3cbb-4e78-8e82-1948ff263181) |
| G2-TEST | Typecheck + API curl + Expo reload smoke | done | [Mirra G2 tester smoke](26273549-2830-430a-8ee2-ae419dc3fe2c) — green; mocks remain |
| G2-UNMOCK | Kill remaining `./mock` primary UI | done | [Unmock remaining Mirra screens](b8da6f46-7b36-413e-a17f-7ea71d76b2d1) |
| G2-PHOTOS | `listProgressPhotos` + delete unused mocks | done | [listProgressPhotos + delete mocks](13406ecf-ff94-4e07-a832-538ed7b0464a) |

## Known break

- `PUT /v1/onboarding` needs `{ profile, preferences }` — mobile must send that shape
- All tab screens still import `mock.ts`

Updated 2026-10-31.
