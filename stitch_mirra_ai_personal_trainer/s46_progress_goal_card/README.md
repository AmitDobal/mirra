# S46 — Progress tab with Goal timeline card

Project `16036285274438790381` · prompt `stitch/prompts/s46_progress_goal_card.md` · Stitch screen `47e1f35d41fe44abbc35940ace6bb7ff` (MOBILE, 390 x 1096pt, first screen of scroll).

Purpose: Progress tab entry to S44. Same Goal timeline card as S45, placed above the photo pair and the weight journey card that `ProgressScreen.tsx` ships today.
Sample: day 35 of the S43/S44 user. Ticket AMI-182.

## Passes
1. Generate (`18fa68520f2a43fc9ac0f4ee569332ae`): wedge started at the left edge and ended in a vertical cut (not a range to the goal line), chevron sat inside the `On track` pill, photo captions on one row.
2. Edit: card chart matches S45 (wedge from today to goal line), chevron outside the pill, captions stacked (`Baseline` / `Nov 4`, `Current` / `Dec 9`). Pass.

## Deviations
- Weight journey shows `79.4 kg` (latest weigh-in) while the goal card and S44 use the 7-day trend (79.6). Intentional per prompt; build may switch the journey number to the trend.
- Compact chart is schematic (shallow trend slope, narrow wedge). Build uses `GoalChart` sparkline mode.
- The active chart icon in the tab pill renders as a sparkle-trend glyph; build keeps the app's existing tab icon.
- Weight journey `Log weight` pill has no icon (matches today's build); S44 uses a scale icon.
- `code.html` carries Stitch's full Tailwind theme (incl. unused error/tertiary tokens); only Kinetic tokens are rendered.

Files: `screen.png`, `code.html`, `stitch.json`.
