# Goal timeline: projection, D1, API, AI context, surfaces

**Status:** architecture for AMI-178..182 (2026-11-04), locked unless PM reopens. **Inputs:** user ask ("show when they will reach their goal, in onboarding, profile, and tell the AI"), `docs/01-research/learnings-symmetry-video.md` (commitment screen), Stitch S06 / S12 / S22 / S41, AMI-165 strength engine, AMI-176 profile PATCH. **Rules:** ports + adapters (`integrations.md`), Zod in `packages/contracts`, files ≤300 lines (prefer 250), tokens only, `sx()`/StyleSheet, no new native deps (OTA via Expo Go).

## 0. Decisions

- **One engine, two callers.** Onboarding runs before auth and offline, and the server must persist the same numbers the user saw. The pure engine therefore lives in `packages/contracts/src/goal-engine/` (no Zod at runtime in hot paths, no I/O, no `Date.now()`; `today` is an argument). `apps/api/src/lib/goal/` only maps D1 rows to engine inputs. No `/v1/goal/preview` endpoint.
- **Estimates, never promises.** Every date is "around <date>" with a range. Band, not a line.
- **No new vendor, no new port.** The engine is deterministic code. AI ports receive a `GoalContext` built by the existing context builders.
- **Start weight is frozen.** `POST /v1/weight` overwrites `profiles.weight_kg`, so the start lives in `goal_plans.start_weight_kg`.
- **Today tab gets no goal chip in v1.** S40/S42 header is full (streak, rank, check-in). The coach briefing carries the goal line instead.

## 1. Goal types

| `preferences.primaryGoal` | Engine `goalType` | Primary metric | ETA means |
| --- | --- | --- | --- |
| `lose_fat` | `fat_loss` | scale trend (kg) | trend reaches `targetWeightKg` |
| `build_muscle` | `muscle_gain` | scale trend + strength | trend reaches `targetWeightKg` |
| `recomp` | `recomp` | weight held in band + strength + photos | "first visible change" window, next tier |
| `performance` | `strength` | overall / top-lift tier step (AMI-165) | next tier step from `nextTarget` |
| `consistency` | `general_fitness` | planned sessions done | habit milestones (day 14 / 30 / 66) |

Weight direction comes from `sign(target − start)` when a goal weight exists and `|Δ| ≥ 1 kg`; else `hold`. A goal type that disagrees with the direction (build_muscle with a lower goal weight) projects the weight direction and sets flag `direction_mismatch` (copy: "Your goal weight is below today's weight, so the timeline shows a cut.").
No goal weight (S06 "Skip target weight") on a weight goal gives `mode: "horizon"`: no ETA, a 12-week projection line, and a "Set a goal weight" CTA.

## 2. Rates (evidence + Mirra mapping)

Evidence: fat loss 0.5–1.0 % BW/week preserves lean mass better than faster loss (Helms et al. 2014, *IJSNEM*; Garthe et al. 2011: 0.7 %/wk kept more LBM than 1.4 %/wk). Lean gain: ~0.25–0.5 % BW/week, slower with training age (Iraki et al. 2019, *Sports*; Aragon/Helms monthly lean-gain model: beginner 1–1.5 %/month, intermediate 0.5–1 %, advanced 0.25–0.5 %). Calorie floors: below ~1,200 kcal (women) / ~1,500 kcal (men) needs supervision (NHLBI obesity guideline). Energy density 7,700 kcal/kg is an approximation (Hall 2008); we use it only for the kcal hint, never for the trajectory.

| Goal | `pace=steady` | `pace=aggressive` | Bounds (kg/wk) |
| --- | --- | --- | --- |
| fat_loss | 0.6 % BW/wk | 1.0 % BW/wk | 0.25 ≤ rate ≤ min(1.0, 1 % BW) |
| muscle_gain `new` | 0.35 % | 0.50 % | 0.10 ≤ rate ≤ 0.5 % BW |
| muscle_gain `months` | 0.30 % | 0.42 % | same |
| muscle_gain `y1_2` | 0.25 % | 0.35 % | same |
| muscle_gain `y3_plus` | 0.15 % | 0.21 % | same |
| recomp / strength / general_fitness with goal weight below start | 0.4 % (slow cut) | 0.6 % | fat_loss bounds |
| recomp / strength / general_fitness with goal weight above start | 0.15 % | 0.20 % | gain bounds |
| hold | 0 (band ± max(1 kg, 1.5 % BW)) | same | n/a |

Rates apply to the **current projected weight each week** (so they taper). S06 example: 82 kg steady = 0.49 kg/wk ("~0.5 kg / week"), aggressive = 0.82 kg/wk.
**Safety clamps** (each sets a flag the UI explains): `ageYears < 18` → aggressive is treated as steady (`minor_pace`). Target below BMI 18.5 for the given height → target clamped to the BMI 18.5 weight (`target_below_healthy`; copy names the clamped number). kcal floor (below) binds → rate reduced (`kcal_floor`). Over 104 weeks → `eta: null` (`beyond_horizon`: "More than 2 years at this pace. Set a nearer milestone.").

**kcal hint** (fed to plan generation, never shown as a promise): BMR = Mifflin-St Jeor (unspecified sex uses the mean constant −78). Activity factor by `trainDays.length`: 0–1 → 1.2, 2–3 → 1.375, 4–5 → 1.55, 6–7 → 1.725. `TDEE − rateKg × 1100` for loss, `TDEE + clamp(rateKg × 1100, 150, 500)` for gain. Floor = max(BMR, 1500 male / 1200 female / 1350 unspecified). Missing age or height → no hint, no floor check (plan generator keeps `sexBand` multipliers). Example: male 29 y, 180 cm, 82 kg, 4 days → BMR 1,805, TDEE 2,798, hint 2,257 kcal.

## 3. Projection model (`packages/contracts/src/goal-engine/`)

Files: `rates.ts` (table, clamps, kcal), `simulate.ts` (weekly stepper), `trend.ts` (EWMA + slope), `adherence.ts`, `project.ts` (assemble), `milestones.ts`, `status.ts`, `index.ts`. `ENGINE_VERSION = "goal-2026.11-v1"`.

**Simulate.** Weekly steps from `w0`: `w ← w ∓ clamp(pct × w, minKg, maxKg)` until the target is crossed (last week fractional) or 104 weeks. Output weekly points for the chart and fractional `weeks`. ETA date = `startOrToday + round(weeks × 7)` days.

**Adherence** `A ∈ [0,1]`, last 28 days (or since start if shorter, minimum 7 days of plan, else prior `A₀ = 0.625`):

| Component | Value | Weight fat_loss / muscle_gain / other |
| --- | --- | --- |
| training | completed sessions ÷ planned lift days (from `plan_days.workout_id`) | 0.3 / 0.5 / 0.5 |
| fuel | days with logged kcal within ±10 % of target ÷ days with any meal logged (needs ≥7 logged days, else dropped and weights renormalized) | 0.5 / 0.35 / 0.3 |
| check-in | days with a check-in ÷ days | 0.2 / 0.15 / 0.2 |

`M(A) = 0.6 + 0.4·A` (prior M = 0.85; full adherence M = 1.0).

**Trend.** Time-aware EWMA on raw logs (Hacker's Diet style): `α = 1 − 0.9^(Δdays)`, seeded with the first log. Observed rate = least-squares slope of trend values over the last 28 days, in kg/wk. Valid only with ≥3 logs spanning ≥14 days. Weight logged before `start_date` is ignored.

**Rates used for the band** (kg/wk at the current trend weight):
- `paceRate` = §2 rate (full adherence). `planRate = paceRate × M(A)`.
- `w = min(0.8, spanDays / 35)` when the trend is valid, else 0. `observed` is clamped to `[0, maxKg]` in the goal direction.
- `expected = (1 − w)·planRate + w·observed`
- `optimistic = expected × (1 + 0.18·(1 − w/2))`, capped at `maxKg`
- `conservative = expected × (1 − 0.30·(1 − w/2))`, floored at 0.1 kg/wk
- `whatIf` = `expected` recomputed with `A = 1`. Shown only when it is ≥7 days earlier than `expected`.
On day 0 this gives optimistic ≈ pace rate, conservative ≈ 0.6 × pace rate. The band narrows as weigh-ins accumulate.

**Moving the wrong way.** Observed slope in the opposite direction for ≥21 days → `status = behind`, flag `trend_reversed`, ETA projected from today's trend with `planRate` (copy: "If you get back on plan: around <date>"). Never extrapolate a reversal.

**Status** (`calibrating` until ≥14 days since start and ≥2 logs): gap = trend − planned line at today (planned line = §3 simulate from start with prior expected rate, stored in `goal_plans`). Tolerance = max(0.5 kg, 10 % of total change). Within → `on_track`; past it in the goal direction → `ahead`; else `behind`. `hold`: inside band → `on_track`, else `behind`. `strength`: ≥1 step-up event in 28 d → `on_track`; training component <0.5 → `behind`; else `calibrating`. `general_fitness`: training ≥0.75 → `on_track`, else `behind`. No `goalWeight` → `no_target`.

**Milestones** (only from data we have; each `{ id, kind, label, detail, date | null, window: [from,to] | null, done }`):

| Goal | Milestones |
| --- | --- |
| fat_loss | `first_change`: expected date of −3 % BW, copy "First visible change (often)"; `halfway`; `pct5` (skip if within 1 kg of halfway or goal); `goal` |
| muscle_gain | `strength_first` (weeks 2–6 window, "Strength usually climbs first"); `plus1kg`; `halfway`; `goal` |
| recomp | `first_change` window weeks 8–12 when A ≥ 0.75 ("Often visible in photos around weeks 8–12"); `photo` checkpoints every 4 weeks (done = a progress photo within ±7 days) |
| strength | `next_division`: from AMI-165 `nextTarget` on the user's highest-sets ranked lift; date = today + ceil(sessions ÷ weekly frequency of that lift in the current plan) weeks; label "Bench press Silver I", detail "80 kg × 8 for 2 sessions" |
| general_fitness | `habit14`, `habit30`, `habit66` ("Research puts the median at about 66 days; it varies a lot", Lally et al. 2010) with done = sessions ≥75 % of planned in that span |
| any with a ranked lift | `next_division` row is appended (max one) |

**Worked example (fixture `goal-82-75-steady`).** Male, 29, 180 cm, 82 kg → 75 kg, steady, `lose_fat`, 4 days, start 2026-11-04. Day 0: rates 0.49 / 0.42 / 0.30 kg/wk (opt / exp / cons). Expected ~17.5 weeks → **around Mar 6, 2027**, range **Feb 16 – Apr 26**. whatIf (4/4 sessions, fuel on target) ≈ Feb 16. Milestones: first change ~Dec 16 (−2.5 kg), halfway 78.5 kg ~Jan 3, 5 % (77.9 kg) ~Jan 13, goal ~Mar 6. Day 35 (Dec 9): trend 79.6 kg, observed 0.48 kg/wk over 35 days (w = 0.8), planned line 79.9 → `on_track`; expected **around Feb 18**, range **Feb 11 – Mar 6**.

## 4. D1 (`0021_goal_timeline.sql`, `db/schema/goal.ts`, AMI-179)

**Migration numbers:** `0021` is reserved for AMI-179. AMI-176 (profile PATCH) writes existing `profiles`/`preferences` columns and needs none (WIP checked 2026-11-04). If AMI-176 later needs one, it takes `0022`. Append the drizzle `_journal.json` entry; rebase on `origin/main` before merge and renumber only if a collision appears.

```
goal_plans (id text PK, user_id text NOT NULL → users.id ON DELETE CASCADE,
  version int NOT NULL, status text NOT NULL 'active'|'superseded',
  goal_type text NOT NULL, primary_goal text NOT NULL, pace text NULL, direction text NOT NULL 'down'|'up'|'hold',
  mode text NOT NULL 'eta'|'horizon'|'milestones',
  start_date text NOT NULL (YYYY-MM-DD local), start_weight_kg real NULL,
  target_weight_kg real NULL, target_effective_kg real NULL (after BMI clamp),
  pace_rate_pct real NOT NULL, pace_rate_kg real NOT NULL, kcal_hint int NULL,
  eta_expected text NULL, eta_optimistic text NULL, eta_conservative text NULL, weeks_expected real NULL,
  planned_line_json text NOT NULL (weekly kg points from start, ≤105),
  flags_json text NOT NULL DEFAULT '[]', inputs_json text NOT NULL (sex, age, height, experience, trainDays, units),
  engine_version text NOT NULL, reason text NOT NULL 'onboarding'|'profile_edit'|'restart'|'backfill',
  committed_at int NULL (ms), created_at int NOT NULL)
  UNIQUE (user_id, version); UNIQUE INDEX goal_plans_active_uq ON goal_plans(user_id) WHERE status = 'active'

goal_snapshots (id text PK, user_id → users.id CASCADE, goal_plan_id → goal_plans.id CASCADE,
  local_date text NOT NULL, trend_weight_kg real NULL, observed_rate_kg real NULL, trend_span_days int NULL,
  adherence real NOT NULL, adherence_json text NOT NULL ({training:{done,planned}, fuel:{onTarget,logged}|null, checkIn:{days,of}}),
  status text NOT NULL, eta_expected text NULL, eta_optimistic text NULL, eta_conservative text NULL,
  what_if_eta text NULL, milestones_json text NOT NULL, trigger text NOT NULL, engine_version text NOT NULL,
  updated_at int NOT NULL)
  UNIQUE (user_id, local_date)   -- one row per day, upserted; also serves "estimate history"
  INDEX goal_snapshots_plan_idx (goal_plan_id, local_date)
```

A **new plan version** is written only when an input changes: goal type, goal weight, pace, experience, train-day count, sex/age/height (kcal hint), or an explicit restart. Behaviour (weigh-ins, sessions, check-ins, meals) only touches the day's snapshot. Superseding = `UPDATE status='superseded'` + `INSERT` in one `db.batch`. Account deletion: both tables cascade from `users`; `assert-account-deletion.ts` gains both. **Backfill:** users with `onboardingCompletedAt` and no plan get v1 lazily on first `GET /v1/goal` (`reason: 'backfill'`, start = their earliest weight log or profile weight, `start_date` = onboarding date).

## 5. API + contracts (`packages/contracts/src/goal.ts`)

```ts
GoalTypeSchema = z.enum(["fat_loss","muscle_gain","recomp","strength","general_fitness"]);
GoalStatusSchema = z.enum(["on_track","ahead","behind","calibrating","no_target"]);
GoalFlagSchema = z.enum(["direction_mismatch","minor_pace","target_below_healthy","kcal_floor","beyond_horizon","trend_reversed"]);
GoalBandSchema = z.object({ optimistic: IsoDate.nullable(), expected: IsoDate.nullable(), conservative: IsoDate.nullable(), weeksExpected: z.number().nullable() });
GoalMilestoneSchema = z.object({ id, kind: z.enum(["weight","visual","strength","habit","photo"]), label, detail: z.string().nullable(), date: IsoDate.nullable(), window: z.tuple([IsoDate, IsoDate]).nullable(), done: z.boolean() });
GoalChartSchema = z.object({ start: IsoDate, unit: z.enum(["kg","lb"]), targetKg: z.number().nullable(),
  planned: z.array(z.number()), optimistic: z.array(z.number()), conservative: z.array(z.number()), // weekly, from start
  actual: z.array(z.object({ date: IsoDate, kg: z.number(), trendKg: z.number() })).max(120), todayIndex: z.number() });
GoalResponseSchema = z.object({ engineVersion, plan: { version, goalType, primaryGoal, pace, direction, mode, startDate, startWeightKg, targetWeightKg, targetEffectiveKg, paceRateKg, kcalHint, committedAt, originalEta: IsoDate.nullable() } | null,
  status: GoalStatusSchema, band: GoalBandSchema, whatIf: { eta: IsoDate, lever: z.enum(["training","fuel","check_in"]) } | null,
  trendKg: z.number().nullable(), toGoKg: z.number().nullable(), adherence: { score, training, fuel, checkIn }, milestones: GoalMilestoneSchema.array().max(8),
  flags: GoalFlagSchema.array(), chart: GoalChartSchema | null });
OnboardingBodySchema += commitment: z.object({ committedAt: z.number().int() }).nullable().optional()   // AMI-178
```

| Endpoint | Behaviour |
| --- | --- |
| `GET /v1/goal` | today's snapshot when `updated_at` ≥ the latest input change, else recompute + upsert (≤8 D1 statements). `ETag: "<plan.version>-<snapshot.updated_at>"`, 304 on match. Mobile caches the last body via `db/repositories/ai-cache.ts` key `goal:v1` (stale-while-revalidate, same as `strength-store.ts`). |
| `POST /v1/goal/restart` | new version from today's trend weight, same target/pace (`reason: 'restart'`). Max 1/day. |

**Recompute triggers** (all `refreshGoalSafe(db, userId, trigger)`, never fail the request, run after the main write):
`PUT /v1/onboarding` (creates v1 with `committedAt`), `PATCH /v1/me/profile` (AMI-176; new version only if a §4 input key is in the body), `POST /v1/weight`, workout complete (`CompleteEffects.goal` next to `recompute`), `POST /v1/check-ins`. Plan generation (`run-plan-job.ts`) reads the active plan's `kcal_hint` (below).

## 6. AI context (`GoalContext`, AMI-181)

Built once per request by `services/goal-context.ts` from the active plan + today's snapshot (no extra AI call). Shape (Zod `GoalContextSchema`, ≤600 chars serialized):

```ts
{ goalType, direction, mode, status, startKg, targetKg, trendKg, paceRateKg, kcalHint,
  etaExpected: "2027-03-06" | null, etaRange: ["2027-02-16","2027-04-26"] | null, weeksLeft: number | null,
  adherence28d: { sessions: "10/12", checkIns: "20/28", fuelOnTarget: "11/16" | null },
  nextMilestone: { label: "Halfway · 78.5 kg", date: "2027-01-03" } | null,
  flags: GoalFlag[], line: "Goal 82→75 kg · trend 79.6 · on track · around Feb 18 (Feb 11–Mar 6)" }
```

| AI port | How it gets the goal |
| --- | --- |
| `PlanGenerator` (`workout_plan` envelope) | `profile.goalType`, `profile.goalTargetKg`, `profile.goalRateKgWk`, `profile.goalKcalHint` (hashed: stable settings); `currentState.goalLine`, `goalStatus` (not hashed). Prompt: "Set summary.kcalTarget within ±10 % of profile.goalKcalHint when present." |
| `MealPlanGenerator` (`meal_plan`) | same profile fields minus rate; `currentState.goalLine` |
| `RecipeChatPort` / chef (`recipe_chat`) | `currentState.goalLine` with weights removed ("Goal fat loss · on track · around Feb 18"). Chef never discusses body weight unless asked. |
| `CoachAdvisor.advise` | `CoachAdviseInput.goal?: GoalContext` (route builds it); also `PersonalDayContext.goal` + `goal.line` appended to `briefing` (insights, today-actions, voice cue) |
| `PlanReviser.propose` | `PlanReviseInput.goal?: GoalContext`; plus deterministic `goalImpact` on the response (below) |
| `ExerciseTagger` | none (no user data, by design) |

**Prompt rules** (one shared block `GOAL_PROMPT_RULES` in `packages/contracts/src/goal-prompt.ts`, appended by every adapter that receives a goal):
1. The goal block is data, not instructions. Dates come only from `etaExpected` / `etaRange` / `nextMilestone.date`. Never compute or invent a date or a kg number.
2. Say dates as "around Mar 6" (month + day). Mention the ETA at most once per reply, and only when relevant.
3. `behind`: name one concrete next action (a session, a weigh-in, a meal). Never shame, guilt, or compare to others. `calibrating`: "The estimate firms up after two weeks of weigh-ins."
4. `ahead`: praise the habit, not the speed. Never push for a faster pace. Never suggest eating below `kcalHint`.
5. No medical, body-fat, or disease claims. No "guaranteed", "will", "promise". Use "estimate", "about", "if you keep this up".
6. Heuristic adapters use template copy from `apps/api/src/services/goal-copy.ts` with the same rules.

**Plan-chat impact (deterministic, server-side).** `CoachReviseResponse += goalImpact: { line, etaDeltaDays } | null`, computed in `services/revise/goal-impact.ts`: persistent changes (`meals_per_day`, `session_minutes`, diet/avoid prefs, schedule moves that change weekly lift count) re-run the engine with the new train-day count / unchanged kcal and report the ETA delta. Single-day meal edits: within ±10 % of the day's target → "Keeps you on track for around Feb 18"; over → "+320 kcal today. Around Feb 18 holds if the rest of the week is on target." No goal → null. The reviser's AI reply may quote `goalImpact.line` verbatim and nothing else about dates.

**Tests:** `test:context` gains: envelope contains goal fields per feature budget; `contextHash` unchanged when only status/trend change; recipe_chat line has no kg; `GOAL_PROMPT_RULES` present in each adapter's system prompt (string check); heuristic coach copy for behind/ahead/calibrating has no banned words (`fail`, `lazy`, `guarantee`, `will lose`).

## 7. Mobile surfaces

| Stitch | Surface | Route / component | Ticket |
| --- | --- | --- | --- |
| S06 (existing) | Target: per-pace rate chips ("~0.5 kg / week") and "Target: ~18 weeks" from the engine, live | `app/(onboarding)/target.tsx` | AMI-180 |
| S12 (existing) | week reveal line "At this pace, ~7 kg by around Mar 6" (engine, not plan copy) | `app/(onboarding)/week-reveal.tsx` | AMI-180 |
| **S43** | Onboarding "Your timeline": chart + ETA range + "What you picked" summary + hold-to-commit. After week-reveal, before auth/paywall. "Not now" continues with `committedAt: null` | `app/(onboarding)/timeline.tsx` | AMI-180 |
| **S44** | Goal screen: hero ETA + status, chart (actual trend vs band), stats row, milestones, "Stay on track", Log weight, Edit goal, disclaimer | `app/goal.tsx` → `features/goal/GoalScreen.tsx` | AMI-182 |
| **S45** | You: "Goal timeline" card directly under `ProfileCard` (AMI-176 layout) → `/goal`; S41 body rows moved behind "Personal details" | `features/you/GoalTimelineCard.tsx` slot in `YouScreen.tsx` | AMI-182 |
| **S46** | Progress tab: same card (compact) above `WeightJourneyCard` | `features/progress/ProgressScreen.tsx` | AMI-182 |

**Non-weight layouts on S44** (no extra Stitch screen; same components): `recomp` / `strength` / `general_fitness` without a goal weight swap the hero for the next milestone ("Next: Bench press Silver I · around Dec 16"), drop the chart card when there are <2 weigh-ins (else show it with the hold band instead of a wedge), and keep milestones + "Stay on track". `horizon` mode shows the 12-week line and a "Set a goal weight" CTA in place of the date.

**Chart** (`features/goal/chart/`, react-native-svg 15.16, already installed): `GoalChart.tsx` renders the band as one filled `Path` (optimistic → conservative reversed) in `secondary` at `fillOpacity` 0.16, the expected line dashed `secondary`, the target as a dashed `outline-variant` hairline with an end label, actual raw weigh-ins as 4 pt `on-surface-variant` dots, the trend as a 2.5 pt `primary-container` line, and today as a vertical `outline-variant` hairline. X labels: month initials in `label-caps`. Geometry is pure in `goal-chart-model.ts` (scales, path strings, label thinning) with unit tests. Onboarding variant has no actual series. Sizes: 390 pt wide minus margins, 180 pt (S44) / 140 pt (S43) / 56 pt sparkline (S45/S46).

**Hold-to-commit** (S43): 56 pt lime pill; long press 1.2 s fills it (Reanimated width), `expo-haptics` success on completion. Writes `commitment.committedAt` into the onboarding store, which `map-body.ts` sends with `PUT /v1/onboarding`. Screen-reader users get a normal tap (accessibilityActions "activate").

**Copy** lives in `src/content/goal.ts`. Honest-copy rules for UI: "around <date>", "estimate", range always visible next to the date, the disclaimer "Estimate based on your pace, logs and plan. Not medical advice." on S43 and S44. No body-fat %, no "guaranteed". Units follow `preferences.units` (engine is kg; display converts).

**Analytics:** none until `AnalyticsPort` exists (learnings doc P0). The commit tap is persisted (`committed_at`) so the retention effect can be measured later.

## 8. Build waves (tickets in `docs/05-project-management/tickets/`)

Wave 0: PM generates + approves Stitch S43–S46 (`stitch/prompts/s43..s46_*.md`).
Wave 1: AMI-178 (engine + contracts).
Wave 2: AMI-179 (API + D1 + triggers; needs AMI-176 merged), AMI-180 (onboarding S06/S12/S43 + chart primitive).
Wave 3: AMI-181 (AI GoalContext), AMI-182 (Goal screen S44, You card S45, Progress card S46).

**Shared-file locks** (append-only, rebase before merge): `packages/contracts/src/index.ts`, `apps/api/src/db/schema/index.ts`, `apps/api/src/app.ts` route list, `apps/api/package.json` scripts, `apps/mobile/src/lib/api/index.ts`, `apps/api/src/db/migrations/meta/_journal.json`, `apps/mobile/app/(onboarding)/_layout.tsx`.
