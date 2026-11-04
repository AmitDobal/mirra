# S44 — Goal timeline

Project `16036285274438790381` · prompt `stitch/prompts/s44_goal_timeline.md` · Stitch screen `adddf01ab3724895a1e331d45824b650` (MOBILE, 390pt wide, full scroll height).

Purpose: full goal screen, opened from the You goal card (S45) and the Progress card (S46). Actual weight trend vs the estimate range, ETA with status,
start / now / to-go stats, milestones, "Stay on track" adherence, Log weight, Edit goal. Arch: `docs/03-engineering/goal-timeline.md` §3, §7.
Build: `app/goal.tsx` → `features/goal/GoalScreen.tsx`, chart in `features/goal/chart/GoalChart.tsx`, ticket AMI-182.

Sample = doc fixture day 35 (Dec 9 2026): trend 79.6 kg, on track, around Feb 18, range Feb 11 – Mar 6 (moved up from Mar 6).

## Passes
1. Generate (`a13a8c57d531471f8b49764b4aa020b0`): content correct, but DESKTOP canvas (2560 wide) and weigh-in dots hard to see.
2. Edit: MOBILE 390pt frame, six grey weigh-in dots visible around the lime trend. Pass.

## Deviations
- Chart is 190pt tall (prompt); the doc says 180pt. Build follows the doc.
- Weigh-in dots sit close to the trend line; real data will scatter more.
- Silver hexagon milestone uses `#c5c9d4` / `#878b96` (strength tier silver) as specified; it is the only tier color on the screen.
- The scale icon on `Log weight` is a Material glyph; build uses the app's lucide `Scale` icon.
- `code.html` carries Stitch's full Tailwind theme; only Kinetic tokens plus the tier silver are rendered.

Files: `screen.png`, `code.html`, `stitch.json`.
