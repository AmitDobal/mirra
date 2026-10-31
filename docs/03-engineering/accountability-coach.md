# Accountability coach — architecture

Goal: Mirra calls out real behavior (kcal over/under, missed lifts) in a harsh-but-motivating trainer voice, with numbers, at ~600 tokens of context. Extends existing code; no parallel system.

## Flow (reuses what exists)

```
buildPersonalDayContext (services/personal-context.ts)   ← D1: meals, sessions, check-ins, plan
  → buildContextPack(db,userId,date)    services/context-pack.ts     (today + 7d summary)
  → detectScenarios(pack)               services/scenario-detector.ts (pure, no I/O)
  → pickPrimary(scenarios)              → { primary, secondary[] }
  ├─ GET  /v1/insights/today   → PersonalInsights (+ scenario, headline, callout)   [deterministic copy, no LLM]
  └─ POST /v1/coach/advise     → CoachAdvisor.advise({ pack, scenario, ... })       [LLM via port, heuristic fallback]
```

Rules: routes call services + `getCoachAdvisor` only. OpenAI stays in `adapters/openai-coach-advisor.ts`. Insights headline is built from templates (free, instant, offline-safe). Coach advise uses the LLM with the scenario prompt. Both read the same pack, so Today and Coach never disagree.

## Context pack (Zod in `packages/contracts/src/accountability.ts`)

```ts
type ContextPack = {
  date: string; tz: string;                       // user tz, not UTC (see gaps)
  today: {
    kcalTarget: number; kcalLogged: number; kcalDelta: number;   // signed: logged - target (+ = over)
    proteinTarget: number; proteinLogged: number; proteinDelta: number;
    mealCount: number; hourLocal: number;
    workout: { title: string | null; planned: boolean; done: boolean };
    checkIn: { done: boolean; status: CheckInStatus | null; readiness: number | null };
  };
  history: {                                       // summary only, never raw meals
    adherence7d: number;                           // 0-100: days within ±10% kcal AND ≥85% protein
    avgKcal7d: number; avgProtein7d: number;
    missedSessions7d: number; plannedSessions7d: number;
    checkInStreak: number; trainingStreak: number;
    lastCheckIns: { date: string; status: string; tone: "good"|"flat"|"bad" }[]; // max 3, note ≤60 chars
  };
  scenario: Scenario; secondary: Scenario[];
};
```

Token cost: serialize as compact `k:v` lines (not pretty JSON); no meal names, no plan text.

## Scenarios (`Scenario` enum)

`OVER_KCAL | UNDER_PROTEIN | MISSED_LIFT | UNDER_EATING | ON_TRACK | STREAK_BREAK | LOW_READINESS`

| Scenario | Fires when |
| --- | --- |
| OVER_KCAL | `kcalDelta > +10%` of target (or > +150 kcal) |
| UNDER_PROTEIN | `hourLocal ≥ 15` and protein < 70% target, or day ended < 85% |
| MISSED_LIFT | workout planned, not done, and (`hourLocal ≥ 19` or yesterday's planned lift missed) |
| UNDER_EATING | `hourLocal ≥ 16` and kcal < 50% target (or day ended < 70%) |
| STREAK_BREAK | no check-in yesterday with prior streak ≥ 3, or 2+ missed sessions in 7d |
| LOW_READINESS | check-in `low_sleep`/`soreness`/`travel`, or readiness ≤ 4 |
| ON_TRACK | none of the above; kcal within ±10%, protein ≥ 85% |

Priority when several fire (first wins; rest go in `secondary`, max 2 cited):
`LOW_READINESS > OVER_KCAL > MISSED_LIFT > STREAK_BREAK > UNDER_PROTEIN > UNDER_EATING > ON_TRACK`.
LOW_READINESS leads so the coach never shames someone told to rest, but OVER_KCAL still gets cited as secondary if present. OVER_KCAL + UNDER_PROTEIN together → one message: "over on kcal, short on protein = junk calories."

## Prompt templates

Shared system (replaces `SYSTEM` in openai-coach-advisor; keep strict JSON output):

```
You are Mirra, a hard-nosed personal trainer. Direct, specific, zero fluff, never cruel about body or worth.
Attack the behavior, not the person. Every reply: (1) name the failure with exact numbers from CTX,
(2) one concrete next action with a number and a time, (3) one line of earned belief using their history.
≤3 sentences, ≤60 words. Never invent numbers. If SCENARIO=ON_TRACK, praise briefly and raise the bar.
Output JSON {"message","rebuildSuggested","vectors"?}.
```

User message: `SCENARIO=<X>\nSECONDARY=<Y,Z>\nTONE=<hint>\nCTX:\n<compact pack>\nNOTE:<user note ≤200 chars>`

| Scenario | TONE hint + required numbers | Example target output |
| --- | --- | --- |
| OVER_KCAL | blunt, no catastrophizing. Cite logged, target, delta | "You logged 2,640 against a 2,200 target. That's +440. Next meal is 40g protein and veg, no extras, and walk 20 minutes tonight. One day doesn't break you; a habit of them does." |
| UNDER_PROTEIN | cite protein logged/target, g remaining | "Protein is 62 of 160g. 98g to go. Two lean meals before 9pm, that's the job." |
| MISSED_LIFT | cite planned title, missedSessions7d | "Push day was on the plan and it's 8pm. 2 missed this week. 30-minute short version now, or it moves to tomorrow with no extra rest day." |
| UNDER_EATING | cite kcal/target; warn about muscle + recovery | "Only 780 of 2,200 kcal by 5pm. Under-eating wrecks your lift. Eat 600 kcal with 40g protein now." |
| STREAK_BREAK | cite old streak, days lost | "Your 6-day streak ended yesterday. Check in now; day one of the next streak starts today." |
| LOW_READINESS | supportive-firm; reduce load, hold nutrition | "Sleep was bad, so drop to 70% volume. Still hit 160g protein; recovery is built at the table." |
| ON_TRACK | brief praise, raise bar; cite adherence7d | "2,180/2,200, 158g protein, lift done. 86% adherence this week. Add 2.5kg to your top set." |

Insights (non-LLM) uses the same table as string templates → `headline` (≤90 chars) + `callout: { tone: "alert"|"warn"|"good", text }`.

## Token budget

- Context pack ≤ 350 tokens; system ≤ 150; user note ≤ 60; output `max_tokens` 160. Total target 400–800 in.
- History is pre-aggregated in SQL (`GROUP BY localDate`, last 7d); lastCheckIns limited to 3 with truncated notes.
- Drop `body.context` free text when pack present (keep only ≤200-char `note`).
- Cache LLM advise per `(userId,date,scenario,kcalLogged bucket 100,workoutDone)` for 10 min in KV; log usage via `logAiUsage`.

## Contract changes

- `PersonalInsightsSchema`: add `fuel.kcalDelta` (signed int), `fuel.proteinDelta`, `scenario`, `secondary[]`, `headline`, `callout`, `history` (adherence7d, missedSessions7d). Keep `kcalRemaining` (clamped) for back-compat.
- `CoachAdviseInput` (port): add `pack?: ContextPack`, `scenario?: Scenario`; keep `context` string as fallback. Heuristic advisor reads `pack`, replacing regex parsing of the briefing string.
- `CoachAdviseResponse`: add `scenario`.

## Gaps in current `personal-context.ts` / UI

1. **Over-target is invisible**: `kcalRemaining = Math.max(0, …)` hides the overage; no signed delta anywhere. Same for protein.
2. **Today brief** shows `win ?? tips[0]`; `win` says "Fuel is moving in the right direction" even when over target. Chip shows "0 kcal left", no target, no over state. Target is not in the brief (it only lives in the header via the store).
3. **FuelScreen** clamps `pct` at 100 and `remaining` at 0; no over-target styling or callout. Target text exists but never reacts to overage.
4. **Coach** gets a flat string `personal: Fuel x/y…` and regex-parses it in the heuristic; OpenAI prompt says "warm and practical, <2 sentences" and only appends `win`. No scenario, no history.
5. **No history at all**: no 7d adherence, missed sessions, tone of past check-ins. Streak counts any check-in row (including `skipped`) as a streak day.
6. **Loads all meals** (`select().from(meals).where(userId)`) and filters in JS; needs a date-bounded query.
7. **UTC day and UTC hour** (`todayUtc`, `getUTCHours`) for tips; the user's tz is needed for "after 3pm" and day bounds.
8. `plannedLiftDays` counts the whole plan, not the week; `workoutDone` only checks `endedAt` (a started session reads as not done).
9. File is 174 lines; adding the pack should go in new files (≤300 each), not grow this one.

## Smoke matrix (API; seed via `POST /v1/fuel/meals`, `POST /v1/check-ins`, `/v1/workouts/sessions`)

| # | Setup | Call | Expect (keywords in `message`/`headline`) |
| --- | --- | --- | --- |
| 1 | target 2200, log 2640 kcal | `GET /v1/insights/today` | `scenario=OVER_KCAL`, `fuel.kcalDelta=440`, headline has "2640"/"2,640", "2200", "440" |
| 2 | same | `POST /v1/coach/advise {}` | `source`∈openai/heuristic; message has "440" or "over"; contains an action (protein/walk) |
| 3 | log 1200 kcal, 40g protein, 4pm | `GET insights` | `UNDER_PROTEIN` (secondary `UNDER_EATING`), "40", "protein" |
| 4 | lift planned, none done, 8pm | `POST advise` | `MISSED_LIFT`, workout title, "tomorrow"/"missed" |
| 5 | 800 kcal logged, 5pm | `GET insights` | `UNDER_EATING`, "800", "eat" |
| 6 | 5-day streak, no check-in yesterday | `GET insights` | `STREAK_BREAK`, "streak" |
| 7 | check-in `low_sleep` + 2640 kcal | `POST advise {status:"low_sleep"}` | primary `LOW_READINESS`, secondary has OVER_KCAL, `rebuildSuggested=true`, message mentions volume + kcal |
| 8 | 2180 kcal, 158g, lift done | `GET insights` | `ON_TRACK`, callout tone `good`, "adherence" |
| 9 | any, `includePersonal:false` | `POST advise` | works, no scenario numbers invented |
| 10 | no `OPENAI_API_KEY` | `POST advise` (case 1) | `source=heuristic`, still cites delta 440 |

Assertions: numbers in copy must equal pack values (test by regex on the pack, not literals); response ≤ 60 words; Zod parses; unit-test `detectScenarios` with pure fixtures (priority table, boundary ±10%).

## Build order (next ticket)

1. contracts `accountability.ts` + delta fields → 2. `context-pack.ts` (SQL-bounded, tz) → 3. `scenario-detector.ts` + tests → 4. insights route templates → 5. advisor port/adapter prompt swap + heuristic → 6. mobile: Today brief shows target + over callout; Fuel over-state; Coach shows scenario chip.
