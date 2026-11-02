# Retention: streaks, in-app notices, badges, body map

**Status:** architecture for AMI-154+  
**Inspiration:** summary.club / Ascend / Bodymap / GymLevels (Mirra naming only)  
**UI SoT:** Stitch Kinetic Performance — danger accent = tertiary crimson `#ff6b8a` / `#b53354` (not raw orange fire). Lime stays primary actions; lavender secondary.

## Product goals

1. **Streak** — visible fire mark on Today / Progress; protect daily check-in (+ optional workout) streak for retention.
2. **In-app notifications** — inbox + opt-in prompt (“Turn on reminders”). **No FCM / device tokens in v1.**
3. **Kinetic ranks (badges)** — Mirra ladder (not “Gold/Legend” copy from competitors): Spark → Ember → Forge → Volt → Apex.
4. **Body map** — male/female anatomical figures; highlight muscles trained by the active exercise / week volume.

## Existing hooks

| Reuse | Path |
| --- | --- |
| Check-in streak math | `apps/api/src/services/history-summary.ts` (`streakFrom`) |
| Attendance week strip | `attendance_day` + Today `WeekStripCard` |
| Bell (toast only) | `TodayHeader` + `today-store.notice` |
| Muscle % bars | `exercise-catalog.json` + `MuscleBars` |
| Sex imagery | `useOnboardingImagery` / profile `sex` |

## DDL (extensible)

Prefer additive nullable columns + new tables. Migrations under `apps/api/src/db/migrations/`.

### `user_streaks`

| col | type | notes |
| --- | --- | --- |
| user_id | text PK+FK | |
| kind | text | `check_in` \| `workout` |
| current_count | int | |
| best_count | int | |
| last_active_date | text ISO date | local-day anchor |
| freeze_remaining | int | v1 default 0 or 1 |
| updated_at | text | |

Recompute from `check_ins` / sessions on write; table is cache + freeze state. Do not make `attendance_day` streak SoT.

### `notification_prefs`

| col | type | notes |
| --- | --- | --- |
| user_id | text PK | |
| in_app_enabled | int 0/1 | user toggle after soft ask |
| streak_reminders | int 0/1 | |
| workout_reminders | int 0/1 | |
| quiet_start / quiet_end | text nullable | HH:mm local |
| updated_at | text | |

No `push_token` column in v1 (leave comment for FCM later).

### `notifications`

| col | type | notes |
| --- | --- | --- |
| id | text PK | |
| user_id | text idx | |
| kind | text | `streak_at_risk` \| `badge_unlock` \| `coach` \| `system` |
| title | text | |
| body | text | |
| payload_json | text | optional deep link |
| read_at | text nullable | |
| created_at | text | |

Indexes: `(user_id, created_at DESC)`, `(user_id, read_at)`.

### `badge_definitions` + `user_badges`

| badge_definitions | |
| --- | --- |
| id | text PK (`streak_7`, `rank_forge`, …) |
| ladder | text | `kinetic_rank` \| `streak_milestone` |
| tier | int | order |
| title | text | Spark / Ember / Forge / Volt / Apex |
| rule_json | text | `{ "type":"streak_gte", "n":7 }` |
| stitch_asset_key | text | |

| user_badges | |
| --- | --- |
| user_id + badge_id | composite PK |
| unlocked_at | text |
| meta_json | text nullable |

### Anatomy (assets, not heavy DDL)

- Catalog muscles map → region ids: `chest`, `back`, `shoulders`, `arms`, `core`, `glutes`, `quads`, `hams`, `calves`, …
- Stitch exports: `anatomy_male_front`, `anatomy_male_back`, `anatomy_female_front`, `anatomy_female_back` + optional region overlays.
- Runtime: tint regions from `CatalogEntry.muscles` (primary strong, secondary soft).

## API (v1)

- `GET /v1/streaks` — current/best + fire state
- `GET /v1/notifications?cursor=` / `POST /v1/notifications/:id/read` / `POST /v1/notifications/read-all`
- `GET|PATCH /v1/notification-prefs`
- Soft-ask: first Today open after entitlements → sheet if `in_app_enabled` null/false
- `GET /v1/badges` — definitions + unlocked
- Cron later for “streak at risk” rows into `notifications` (Worker cron ok; still not FCM)

## Mobile surfaces

1. Today header: fire chip + streak count (crimson)
2. Progress / You: Kinetic rank card + badge grid
3. Bell → Notification inbox screen (not toast-only)
4. Exercise detail: BodyMap (sex-aware) beside/above MuscleBars
5. Settings: notification toggles

## Performance

- Streak recompute O(lookback) on check-in write; cache in `user_streaks`
- Notifications: paginate 20; unread badge = count query limited
- Anatomy: static PNGs/SVG regions; no per-frame generative cost
- Badge unlock: evaluate on streak/workout commit, insert-ignore

## Out of scope v1

FCM / APNs tokens, social leagues, summary.club clone naming, paid XP shops.

## Ticket wave

| ID | Scope |
| --- | --- |
| AMI-154 | DDL + contracts + streak API/UI (fire) |
| AMI-155 | In-app notification prefs + inbox |
| AMI-156 | Kinetic ranks / badges |
| AMI-157 | Body map male/female Stitch assets + exercise detail |
