# AMI-180 — Onboarding timeline: S06 pace rates, S12 pace line, S43 "Your timeline" + commit, chart primitive

**Wave 2** · parallel with AMI-179 · **Depends:** AMI-178 merged; S43 approved · Arch §2, §3 (worked example), §7

## Why
Users should see, before they pay, what they picked and roughly when it pays off. A commitment step at the end of onboarding is the one screen Symmetry measured at +3 % retention (`docs/01-research/learnings-symmetry-video.md` §5).

## Scope
1. Chart primitive `apps/mobile/src/features/goal/chart/{GoalChart.tsx, goal-chart-model.ts, goal-chart-model.test.ts}` per §7 (react-native-svg only; band, expected dashed line, target line + label, optional actual dots + trend line, today hairline, month labels; `variant: "full" | "onboarding" | "spark"`). Pure geometry in the model, ≥12 `node:test` cases (scales, empty series, single point, label thinning at 390 and 320 pt, lb conversion).
2. `features/onboarding/use-goal-preview.ts`: maps store answers → `previewGoal(answers, today)` from `@mirra/contracts` (memoized; units from `weightUnit`).
3. S06 `app/(onboarding)/target.tsx`: per-pace rate on each option ("~0.5 kg / week", lb when imperial) and "Target: ~18 weeks" (Stitch S06 already shows both; today's code does not). Skip keeps working (horizon mode).
4. S12 `week-reveal.tsx`: the trending line becomes the engine line "At this pace, ~7 kg by around Mar 6" when a goal weight exists; else today's `outcome`. Primary CTA now goes to `/(onboarding)/timeline`. `week-reveal.tsx` is 273 lines: extract the footer into `components/WeekRevealFooter.tsx` first.
5. S43 `app/(onboarding)/timeline.tsx` → `features/onboarding/components/TimelineScreen*.tsx`: eyebrow, headline, ETA + range, `GoalChart` (onboarding variant), milestone chips, "What you picked" summary card (goal, current → goal weight, pace + rate, days/week + session length, experience, kcal from the generated plan summary), whatIf line, `HoldToCommit` (1.2 s, Reanimated + expo-haptics, a11y activate), "Not now" ghost link, disclaimer. Commit or "Not now" then runs the existing `handleWeekRevealStart()`.
6. Store: `commitment: { committedAt: number } | null` + setter; `map-body.ts` sends it as `commitment`. Add `Stack.Screen name="timeline"` in `_layout.tsx` after `week-reveal`.
7. Copy in `src/content/goal.ts` (onboarding section) and `src/content/onboarding.ts` (S06 strings). No English in components.

## File ownership
`apps/mobile/src/features/goal/chart/**` (new) · `apps/mobile/app/(onboarding)/{timeline.tsx (new), target.tsx, week-reveal.tsx, _layout.tsx (one line)}` · `apps/mobile/src/features/onboarding/{store.ts, map-body.ts, use-goal-preview.ts (new), components/{TimelineScreen*,HoldToCommit,WeekRevealFooter}.tsx (new)}` · `apps/mobile/src/content/{goal.ts (new, onboarding section), onboarding.ts}`.

## Acceptance criteria
1. Answers male / 29 / 180 cm / 82 kg → 75 kg / steady / 4 days: S06 shows "~0.5 kg / week" (steady) and "~0.8 kg / week" (aggressive), "Target: ~18 weeks". S43 shows "Around Mar 6", "Feb 16 – Apr 26", milestones and summary matching the S43 Stitch sample when today = 2026-11-04 (inject a fixed date in dev).
2. Imperial user sees lb everywhere on S06/S12/S43; the engine still receives kg.
3. Hold 1.2 s → haptic, store has `committedAt`; `PUT /v1/onboarding` body carries it (log the body in dev). "Not now" → `commitment: null`. Both continue to auth/paywall exactly as before.
4. Skipped goal weight → S43 shows the 12-week horizon line and no date; no crash on S12.
5. Screenshots in `docs/smoke/ami-180/` (390, SE, Android) next to Stitch S06, S12 and S43 `screen.png`. No extra elements Stitch lacks. Files ≤300 lines, no hex, `sx()` only.

## Path index
`app/(onboarding)/{target,week-reveal,mirror}.tsx`, `features/onboarding/{store,map-body,index}.ts`, `features/onboarding/services/week-reveal-nav.ts`, `features/progress/WeightSparkline.tsx` (what the chart replaces later), `ui/{Button,LimeCta,CapsLabel}.tsx`, `theme/tokens.ts`, Stitch S06/S12/S43.
