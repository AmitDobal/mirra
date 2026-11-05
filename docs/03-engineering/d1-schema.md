# Mirra — D1 schema (DDL design)

**Runtime:** Cloudflare D1 (SQLite) · **ORM:** Drizzle · **Migrations:** `apps/api/src/db/migrations/`  
**Conventions:** opaque text PKs (`nanoid`); times = UTC unix **ms** integer; bool = `0/1`; money = integer **cents**; cascade user-owned data on user delete except payment/audit.

## ER overview

```mermaid
erDiagram
  users ||--o| profiles : has
  users ||--o| preferences : has
  users ||--o{ sessions : auth
  users ||--o{ accounts : oauth
  users ||--o| entitlements : sub
  users ||--o{ plans : owns
  plans ||--o{ plan_days : days
  plans ||--o{ workouts : sessions_planned
  workouts ||--o{ workout_exercises : exercises
  users ||--o{ workout_sessions : logged
  workout_sessions ||--o{ set_logs : sets
  users ||--o{ meals : logs
  users ||--o{ check_ins : daily
  users ||--o{ progress_photos : r2
  users ||--o{ weight_logs : optional
  users ||--o{ media_objects : r2_meta
  payment_events }o--|| users : optional
  plan_jobs }o--|| users : queue
```

---

## Auth (Better Auth–compatible)

### `users`
| Column | Type | Notes |
| --- | --- | --- |
| id | text PK | |
| email | text unique null | |
| email_verified | integer | 0/1 |
| name | text null | display |
| image | text null | avatar URL |
| created_at | integer | ms |
| updated_at | integer | ms |
| banned | integer | abuse kill switch |

### `sessions` · `accounts` · `verifications`
Standard Better Auth tables (id, user_id, token, expires_at, provider_id, …). Mirror HitDM shapes where possible.

---

## Profile & onboarding

### `profiles`
| Column | Type | Notes |
| --- | --- | --- |
| user_id | text PK FK users | |
| sex | text null | `female`/`male`/`unspecified` |
| age_years | integer null | |
| height_cm | real null | |
| weight_kg | real null | |
| goal_weight_kg | real null | |
| pace | text null | `steady`/`aggressive` |
| timezone | text | IANA |
| onboarding_completed_at | integer null | |
| created_at / updated_at | integer | |

### `preferences`
| Column | Type | Notes |
| --- | --- | --- |
| user_id | text PK FK | |
| primary_goal | text | lose_fat / build_muscle / recomp / consistency / performance |
| experience | text | new / months / y1_2 / y3_plus |
| equipment_json | text | JSON string array |
| train_days_json | text | e.g. `[1,3,5]` Mon=1 |
| session_minutes | integer | 20/30/45/60 |
| diet_tags_json | text | |
| foods_avoid | text null | |
| units | text | `metric`/`imperial` |
| updated_at | integer | |

---

## Plans (versioned — rebuild safe)

### `plans`
| Column | Type | Notes |
| --- | --- | --- |
| id | text PK | |
| user_id | text FK | index |
| version | integer | monotonic per user |
| status | text | `generating`/`ready`/`superseded`/`failed` |
| week_start | text | `YYYY-MM-DD` user-local |
| summary_json | text | macros target, outcome line |
| source | text | `onboarding`/`rebuild`/`manual` |
| parent_plan_id | text null | rebuild lineage |
| created_at | integer | |

### `plan_days`
| Column | Type | Notes |
| --- | --- | --- |
| id | text PK | |
| plan_id | text FK | |
| day_index | integer | 0–6 |
| date | text | YYYY-MM-DD |
| kind | text | `lift`/`rest`/`fuel` |
| label | text null | Push / Pull / Legs |
| workout_id | text null FK | |

### `workouts` (templates inside a plan)
| Column | Type | Notes |
| --- | --- | --- |
| id | text PK | |
| plan_id | text FK | |
| title | text | |
| duration_min | integer | |
| focus | text null | upper/lower/… |
| calorie_est | integer null | |
| sort_order | integer | |

### `workout_exercises`
| Column | Type | Notes |
| --- | --- | --- |
| id | text PK | |
| workout_id | text FK | |
| name | text | |
| cue | text null | short form tip |
| target_sets | integer | |
| target_reps | text | e.g. `8-10` |
| rest_sec | integer null | |
| sort_order | integer | |
| swap_group | text null | for swap exercise |

### `plan_jobs`
| Column | Type | Notes |
| --- | --- | --- |
| id | text PK | |
| user_id | text FK | |
| kind | text | `generate`/`rebuild` |
| status | text | `queued`/`running`/`done`/`failed` |
| input_json | text | |
| error | text null | |
| plan_id | text null | result |
| created_at / finished_at | integer | |

---

## Workout logging

### `workout_sessions`
| Column | Type | Notes |
| --- | --- | --- |
| id | text PK | |
| user_id | text FK | |
| workout_id | text null | template |
| started_at | integer | |
| ended_at | integer null | |
| rpe | integer null | 1–10 |
| notes | text null | |
| totals_json | text null | duration, volume |

### `set_logs`
| Column | Type | Notes |
| --- | --- | --- |
| id | text PK | |
| session_id | text FK | |
| exercise_id | text null | |
| exercise_name | text | denorm if swapped |
| set_index | integer | |
| weight_kg | real null | |
| reps | integer null | |
| completed | integer | 0/1 |
| logged_at | integer | |

---

## Nutrition

### `meals`
| Column | Type | Notes |
| --- | --- | --- |
| id | text PK | |
| user_id | text FK | |
| eaten_at | integer | |
| name | text | |
| meal_slot | text | breakfast/lunch/dinner/snack |
| kcal | integer | |
| protein_g | real | |
| carbs_g | real | |
| fat_g | real | |
| media_id | text null | R2 meal snap |
| created_at | integer | |
| fiber_g / sugar_g / sodium_mg | integer null | micros (0012) |
| ingredients_json | text null | `[{name, grams?, kcal?, proteinG?, carbsG?, fatG?, confidence?}]` |
| warnings_json | text null | string[] wellness notes |
| analysis_status | text | `none`/`pending`/`ready`/`failed`, default `none` |
| analysis_source | text null | `openai`/`anthropic`/`heuristic` |
| estimate_confidence | real null | 0–1 |

Daily targets live on `plans.summary_json` (or denorm `daily_targets` later if needed).

### `nutrition_day_rollup` (0012)
PK `(user_id, local_date)`. `kcal_in`, `protein_g`, `carbs_g`, `fat_g` (sums of meals), `kcal_target` null, `workout_minutes`, `sets_completed`, `updated_at`. Rebuilt on meal/workout write so history charts stay cheap. Mirrored in mobile SQLite 007.

### `meal_analysis_jobs` (0012)
`id` PK · `user_id` FK · `meal_id` null · `media_id` null · `status` (`queued`/`running`/`done`/`failed`) · `input_json` · `result_json` null (MealEstimateResultV2) · `error` null · `created_at` · `finished_at` null. Same pattern as `plan_jobs`. Spec: `calorie-history-meal-vision.md`.

---

## Coach / accountability

### `check_ins`
| Column | Type | Notes |
| --- | --- | --- |
| id | text PK | |
| user_id | text FK | |
| local_date | text | YYYY-MM-DD unique per user |
| status | text | done / partial / skipped / soreness / low_sleep / travel |
| note | text null | |
| triggered_rebuild | integer | 0/1 |
| created_at | integer | |

Unique index: `(user_id, local_date)`.

---

## Progress media

### `media_objects`
| Column | Type | Notes |
| --- | --- | --- |
| id | text PK | |
| user_id | text FK | |
| kind | text | mirror / progress / meal |
| r2_key | text | |
| content_type | text | |
| bytes | integer null | |
| created_at | integer | |

### `progress_photos`
| Column | Type | Notes |
| --- | --- | --- |
| id | text PK | |
| user_id | text FK | |
| media_id | text FK | |
| pose | text | front / side |
| taken_at | integer | |
| note | text null | |

### `weight_logs`
| Column | Type | Notes |
| --- | --- | --- |
| id | text PK | |
| user_id | text FK | |
| kg | real | |
| logged_at | integer | |

---

## Goal timeline (0021, AMI-179)

Spec: `goal-timeline.md` §4. Both tables cascade from `users` (account deletion covered by `test:account-delete`).

### `goal_plans` (0021)
Versioned goal plan. `id` PK · `user_id` FK · `version` (unique per user) · `status` `active`/`superseded` (partial unique index `goal_plans_active_uq`: one active per user) · `goal_type` · `primary_goal` · `pace` null · `direction` `down`/`up`/`hold` · `mode` `eta`/`horizon`/`milestones` · `start_date` (local) · `start_weight_kg` null (**frozen**; weigh-ins never touch it) · `target_weight_kg` null · `target_effective_kg` null (after BMI clamp) · `pace_rate_pct` · `pace_rate_kg` · `kcal_hint` null · `eta_expected`/`eta_optimistic`/`eta_conservative` null (day-0 band; `originalEta`) · `weeks_expected` null · `planned_line_json` (weekly kg, ≤105) · `flags_json` · `inputs_json` · `engine_version` · `reason` `onboarding`/`profile_edit`/`restart`/`backfill` · `committed_at` null (ms, S43) · `created_at`. New version only when a §4 input changes; supersede + insert in one batch.

### `goal_snapshots` (0021)
Today's projection, one row per `(user_id, local_date)` (unique; upserted by every trigger, doubles as estimate history). `id` PK · `user_id` FK · `goal_plan_id` FK (cascade) · `trend_weight_kg` / `observed_rate_kg` / `trend_span_days` null · `adherence` · `adherence_json` · `status` · `eta_*` + `what_if_eta` null · `milestones_json` · `trigger` · `engine_version` · `updated_at` (ETag `"<version>-<updated_at>"`). Index `(goal_plan_id, local_date)`.

---

## Monetization

### `entitlements`
| Column | Type | Notes |
| --- | --- | --- |
| user_id | text PK FK | |
| status | text | trial / active / expired / grace |
| product_id | text null | RC product |
| rc_app_user_id | text null | |
| expires_at | integer null | |
| updated_at | integer | |

### `payment_events`
| Column | Type | Notes |
| --- | --- | --- |
| id | text PK | RC event id (idempotent) |
| user_id | text null | |
| type | text | |
| payload_json | text | redact secrets |
| created_at | integer | |

Keep after user delete for audit.

---

## Ops

### `rate_limits`
key text PK · count integer · window_start integer

### `audit_log`
id · user_id null · action · meta_json · created_at

---

## Indexes (minimum)

- `plans(user_id, version DESC)`
- `plan_days(plan_id, day_index)`
- `workout_sessions(user_id, started_at DESC)`
- `meals(user_id, eaten_at DESC)`
- `nutrition_day_rollup(user_id, local_date)` PK + index
- `meal_analysis_jobs(user_id)`, `(status, created_at)`
- `check_ins(user_id, local_date)` UNIQUE
- `progress_photos(user_id, taken_at DESC)`
- `payment_events(id)` PK = idempotency

## Extensibility notes

- Add `coach_messages` later without breaking check_ins
- Exercise library can become global `exercises` table; v1 stores names on plan rows
- Multi-device sync = same user_id; no workspace model in v1
