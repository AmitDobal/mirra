# Actionable goals UI — Today hero, checklist, Fuel macros, live set log

Goal: every screen answers "what do I do next?" with one tap, using real data only. Extends `accountability-coach.md` (same `ContextPack`, same scenarios); no parallel brain. Visuals follow Stitch `s15_today`, `s18_fuel`, `s16_live_workout_hud` (tokens in `kinetic_performance/DESIGN.md`; no new colors/radii). Files ≤300 lines; integrations stay behind ports (`MealEstimator`, `CoachAdvisor`).

## Audit gaps this closes (authoritative)

| Gap | Today | Fix |
| --- | --- | --- |
| Plan + macro targets exist, no goal surface | AI plan gives kcal/P/C/F; Today shows only a brief chip | `GET /v1/today/actions` → hero + checklist |
| Today exercise list not tappable | static rows in `features/today` | row → `/workout/[id]?focus=<exerciseId>` |
| Fuel hides carbs/fat | `GET /v1/fuel/today` already returns `targets/logged/remaining` for C/F | render 3 meters (UI only) |
| Water local-only | `useState` in `FuelScreen` | `water_logs` table + `POST /v1/water`, in fuel + actions |
| Live Log Set = complete only | `LogSetBodySchema.weightKg` exists; UI never sends it | weight/reps steppers prefilled from target + last set |
| Coach accountability live | `/v1/insights/today`, `/v1/coach/advise` | reused as hero copy source, unchanged |

## Data model (Zod in `packages/contracts/src/today-actions.ts`)

```ts
type GoalStatus = "pending" | "done" | "over" | "skipped";
type GoalKind = "workout" | "meal" | "protein" | "checkin" | "cardio" | "water";

type DailyGoal = {                 // one checklist row
  id: string;                      // stable per day: `${date}:${kind}[:${ref}]`
  kind: GoalKind;
  title: string;                   // ≤40 chars, e.g. "Upper Strength", "Hit 140g protein"
  subtitle: string | null;         // ≤60 chars, numbers from pack only
  status: GoalStatus;              // over = macro/kcal exceeded target (never for workout/checkin)
  ctaRoute: string;                // expo-router href, see table below
  metric: { label: "kcal"|"g"|"L"|"sets"|"min"; current: number; target: number } | null;
};

type NextAction = Pick<DailyGoal, "kind"|"title"|"ctaRoute"> & {
  goalId: string;                  // points into goals[]
  reason: string;                  // ≤90 chars; = insights.headline when scenario applies
  ctaLabel: string;                // "Start workout" | "Log meal" | "Check in" | "Log water"
  tone: "alert" | "warn" | "good"; // = insights.callout.tone
};

type MacroMeter = {                // remaining-first
  key: "kcal"|"proteinG"|"carbsG"|"fatG";
  target: number; logged: number;
  remaining: number;               // clamped ≥0 (display big number)
  delta: number;                   // logged - target, signed (+ = over)
  state: "under" | "hit" | "over"; // hit = within ±5% (kcal ±10%); over = delta beyond that
};

type TodayActionsResponse = {
  date: string; tz: string;
  next: NextAction | null;         // null only when every goal is done/skipped
  goals: DailyGoal[];              // ordered, max 6
  macros: MacroMeter[];            // [kcal, protein, carbs, fat]
  hydration: { targetMl: number; loggedMl: number } | null;
  scenario: Scenario;              // from existing ContextPack
};
```

`ctaRoute` map: workout → `/workout/{id}`; meal/protein → `/(tabs)/fuel?sheet=log` (protein goal: `&focus=protein`); checkin → `/check-in`; cardio → `/workout/{id}?block=cardio`; water → `/(tabs)/fuel?sheet=water`.

## Goal derivation (pure `services/today-actions.ts`, no I/O)

| Goal | Included when | done | over | skipped |
| --- | --- | --- | --- | --- |
| workout | plan day has workoutId | session `endedAt` set | — | check-in `rest`/LOW_READINESS rest day |
| meal | ≥1 meal slot due by `hourLocal` (breakfast 10, lunch 14, dinner 21) | meals logged ≥ slots due | — | — |
| protein | target > 0 | protein ≥ 95% target | never (more protein is not "over") | — |
| checkin | always | today's row exists | — | status `skipped` |
| cardio | plan day/workout has a cardio block (else omit) | block set logged | — | — |
| water | `hydration` present | logged ≥ target | — | — |

kcal over/under/hit lives on `macros[0]` and the Fuel hero, not as a checklist row. Hero `next` = first pending goal by scenario-aware priority: LOW_READINESS → checkin; MISSED_LIFT → workout; UNDER_PROTEIN/UNDER_EATING → meal/protein; OVER_KCAL → protein (swap, not more food) or workout; otherwise plan order (workout, meal, protein, checkin, water). `reason` reuses `accountability-copy.ts` templates (free, offline, same numbers as Coach).

## API decision: new `GET /v1/today/actions` (not extending `/v1/insights/today`)

- `insights/today` is the coach-copy contract with back-compat obligations (`kcalRemaining` clamp, scenario, callout). Bolting a tappable checklist, routes, and macro meters onto it couples copy to UI and pushes `personal-context.ts` past 300 lines.
- `/v1/today` stays the plan aggregate (week strip, workout, summary). Actions is a different lifecycle (changes after every tap, must refetch cheaply) vs plan data (stable).
- One call feeds Today hero + checklist + macro strip; internally it calls `buildContextPack` once and `buildTodayActions(pack, plan, hydration)`, so it can never disagree with Coach. Insights stays the source for `headline/callout` strings via shared `accountability-copy.ts`.
- Mobile: TanStack Query key `["today-actions", date]`, invalidated by meal/water/set/check-in mutations (optimistic status flip, refetch to confirm).
- Also add: `POST /v1/water {ml, localDate}` + `water_logs(id,user_id,local_date,ml,logged_at)`; extend `GET /v1/fuel/today` with `hydration`. Reuse existing `POST /v1/workouts/sessions/:id/sets` (already accepts `weightKg`, `reps`).

## UI placement

**Today (s15)**: below header, replace brief chip with **Hero card** (Today's Focus slot): eyebrow = scenario tone, title = `next.title`, body = `next.reason`, full-width primary button `next.ctaLabel` → `ctaRoute`. Under it a compact **Today checklist** (2-line rows: status icon, title, subtitle, metric `110/140g`, chevron; whole row tappable; done = check, over = amber, skipped = muted). Existing Daily Motion / Routine sections stay; **each routine exercise row becomes tappable** → live workout focused on that exercise (starts session if none). Micro-strip under checklist: 4 thin macro bars from `macros`.

**Fuel (s18)**: big number = kcal remaining (state `over` → "+440 over", alert color, no clamp-to-0 text). Three meters PROTEIN / CARBS / FATS (s18 rings/bars) each showing `logged /target g`, remaining-first label "30g left", state color: under = primary, hit = success, over = warning. Hydration card uses server `hydration` (+250 ml / +500 ml chips → `POST /v1/water`); target = `weightKg*35` ml rounded to 250, default 3000 if no weight. **No vitamin/mineral UI** unless a real data source exists (see out of scope).

**Meal log (s19) AI flow**: photo/description → `POST /v1/fuel/estimate` (existing `MealEstimator` port) → confirm sheet with editable name, kcal, P/C/F steppers, slot picker → `POST /v1/fuel/meals`. Never auto-save an estimate; label estimate source ("AI estimate — edit if off").

**Live workout (s16)**: "Log Set N Complete" becomes a row of two steppers (KG, REPS) prefilled with `target load × reps` from the plan, else last logged set for that exercise (local SQLite `sessions` repo first, API second). Primary button "Log set" sends `{exerciseId, setIndex, weightKg, reps, completed:true}`; offline-first write to the local queue, sync later. Stepper ±2.5 kg / ±1 rep, long-press repeats, tap number to type. Set chips (SET 1..5) show `100×8` once logged; tapping a logged chip edits it. Rest timer starts on log (Rest Target in HUD). After session complete the checklist workout row flips to done.

## Build order (6 steps, one ticket each; ≤400-word returns)

1. **Contracts + DB**: `today-actions.ts` Zod, `water_logs` migration, `hydration` on fuel contract, `MacroMeter` helper (`state` thresholds) with unit tests.
2. **API**: `services/today-actions.ts` (pure) + `routes/today-actions.ts`; `POST /v1/water`; reuse `buildContextPack`; copy from `accountability-copy.ts`.
3. **Mobile Today**: `useTodayActions`, `HeroNextCard`, `GoalChecklist`, tappable exercise rows, macro micro-strip.
4. **Mobile Fuel**: P/C/F meters with over/under/hit, remaining-first kcal, server-backed water, AI estimate confirm sheet polish.
5. **Mobile Live workout**: weight/reps steppers, prefill, edit logged set, offline queue, invalidate `today-actions`.
6. **QA + coach tie-in**: smoke scripts, Maestro flows, hero reason == coach scenario copy, docs/STATUS update.

## Smoke matrix

API (`apps/mobile/scripts/smoke-api.mjs` + new `smoke-today-actions.mjs`; numbers asserted against the pack, not literals):

| # | Setup | Call | Expect |
| --- | --- | --- | --- |
| A1 | fresh user, plan, 9am | `GET /v1/today/actions` | `next.kind=workout`, `goals` has workout/protein/checkin/water, `macros[0].state=under` |
| A2 | log 2640 kcal vs 2200 | same | `macros[0].state=over`, `delta=440`, `scenario=OVER_KCAL`, `next.reason` cites 440 |
| A3 | 40/160g protein, 4pm | same | protein goal `pending`, metric 40/160, `next.kind∈{meal,protein}` |
| A4 | protein ≥ 95% | same | protein `done`; never `over` |
| A5 | complete session | same | workout `done`; `next` advances |
| A6 | `POST /v1/check-ins` | same | checkin `done` |
| A7 | `POST /v1/water {ml:500}` ×2 | same + `GET /v1/fuel/today` | `hydration.loggedMl=1000` in both |
| A8 | `POST .../sets {weightKg:100,reps:8}` | read set back | `weightKg=100`, `reps=8` persisted |
| A9 | rest day / LOW_READINESS | same | workout `skipped`, `next.kind=checkin` |
| A10 | no plan | same | 200, `goals` without workout, no throw |

Maestro (`apps/mobile/.maestro/`, dev-auth seeded user):

| # | Flow | Assert |
| --- | --- | --- |
| M1 | open Today | hero visible, CTA `Start workout`; checklist ≥3 rows |
| M2 | tap hero CTA | Live workout opens on exercise 1 |
| M3 | tap routine exercise row #3 | Live workout opens focused on exercise 3 |
| M4 | set 100 kg × 8 → Log set | chip shows `100×8`; back on Today, metric reflects |
| M5 | Fuel tab | three meters + "left" labels; hydration `+500` updates to `0.5L` and survives app restart |
| M6 | Snap/describe meal → confirm edit P/C/F → save | Fuel remaining drops; checklist protein metric updates |
| M7 | log over target | kcal hero reads "over", alert styling, Today macro bar amber |
| M8 | tap Check-in row | check-in sheet opens; row flips to done after submit |

## Out of scope v1

- Free-form chat as the primary Today UI (Coach tab stays secondary; hero is deterministic, tappable).
- Fake micronutrients (vitamins/minerals/fiber ring). Add only when a real source (barcode DB or verified estimator field) exists; hydration is the only "micro" shown.
- Full barcode / food database (v2; would be a new `FoodLookup` port + adapter).
- Custom user-defined goals, goal editing UI, push-notification nudges, wearable steps/active-kcal as goals.
