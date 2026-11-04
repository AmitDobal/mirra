# AMI-182 — Goal screen (S44), You goal card (S45), Progress entry (S46)

**Wave 3** · parallel with AMI-181 · **Depends:** AMI-179, AMI-180 (chart primitive), AMI-176 merged; S44, S45, S46 approved · Arch §5, §7

## Why
After onboarding, users need one place to see the estimate move with their real logs, what is next, and what keeps them on track. The profile and Progress tab link to it.

## Scope
1. `lib/api/goal.ts`: `getGoal()` (sends `If-None-Match`), `restartGoal()`. `features/goal/goal-store.ts`: stale-while-revalidate via `db/repositories/ai-cache.ts` key `goal:v1` (same pattern as `strength-store.ts`). Refetch after `logWeight`, workout complete and check-in.
2. `features/goal/goal-view.ts` (+ `goal-view.test.ts`, ≥15 cases): API body → view model (status pill copy, "around <date>" + range, kg/lb, to-go, milestone rows, adherence rows "10/12 sessions", whatIf or keep line, flag notices).
3. `app/goal.tsx` → `features/goal/GoalScreen.tsx` (S44): top bar, hero ETA + status pill, `GoalChart` full variant, stats row (Start / Now / To go), "Moved from <originalEta>" line when different, milestones list, "Stay on track" card, "Log weight" (reuse `LogWeightSheet`), "Edit goal" (opens AMI-176 edit sheet for goal weight / pace), "Restart from today" in an overflow, disclaimer. Loading skeleton, error, horizon (no goal weight → "Set a goal weight" CTA), non-weight goals (milestones-first layout, arch §7 "Non-weight layouts").
4. `features/you/GoalTimelineCard.tsx` (S45) in the slot directly under `ProfileCard` in AMI-176's `YouScreen.tsx` → `/goal`. Spark chart, "82 → 75 kg · Steady", status + "around Feb 18".
5. Progress tab (S46): the same card (compact variant) above `WeightJourneyCard` in `ProgressScreen.tsx`.
6. Copy in `src/content/goal.ts` (screen + card sections; AMI-180 owns the onboarding section, append only).

## File ownership
`apps/mobile/app/goal.tsx` (new), `app/_layout.tsx` (one `Stack.Screen`) · `apps/mobile/src/features/goal/**` except `chart/` (AMI-180) · `apps/mobile/src/features/you/{GoalTimelineCard.tsx (new), YouScreen.tsx (one slot)}` · `apps/mobile/src/features/progress/ProgressScreen.tsx` (one slot), `weight-store.ts` (refetch hook) · `apps/mobile/src/lib/api/goal.ts` (new) · `apps/mobile/src/content/goal.ts` (screen sections) · lock: lib/api index.

## Acceptance criteria
1. Fixture user (AMI-179 seed, day 35, metric): S44 shows "Around Feb 18", "Feb 11 – Mar 6", "On track", Start 82.0 / Now 79.6 / To go 4.6 kg, "Moved up from Mar 6", 6 actual dots + trend line inside the band, milestones Halfway / 5 % / Goal with dates, adherence rows. Matches the S44 Stitch sample.
2. Log 79.2 kg from S44 → chart and numbers refresh without leaving the screen; the You card and Progress card show the same ETA.
3. `behind` fixture shows the action line and no red/crimson styling (crimson is destructive-only per DESIGN.md). Calibrating user sees "Estimate firms up after two weeks of weigh-ins."
4. Imperial user sees lb; recomp user sees the milestones-first layout; no goal weight shows the CTA, which opens the edit sheet.
5. Screenshots in `docs/smoke/ami-182/` (390, SE, Android) next to Stitch S44, S45 (You, scrolled to top) and S46 `screen.png`. Fonts, radii and colors match; nothing Stitch lacks. Offline launch shows the cached card. Files ≤300 lines, no hex.

## Path index
`features/strength/{strength-store,StrengthMapScreen}.ts(x)` (store + screen pattern), `features/progress/{WeightJourneyCard,LogWeightSheet,weight-store}.tsx`, AMI-176 `features/you/{YouScreen,ProfileCard,ProfileEditSheet}.tsx`, `db/repositories/ai-cache.ts`, `ui/*`, Stitch S44/S45/S46 + S41.
