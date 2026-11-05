# S45 — You / Profile with Goal timeline card

Project `16036285274438790381` · prompt `stitch/prompts/s45_profile_goal_card.md` · Stitch screen `73403f68574a4b448fbc5b732343ed4f` (MOBILE, 390 x 884pt, top of scroll).
Edit of S41 (`../s41_profile_v2`, screen `fae59e7ff5654122b3ce5935c3c4b850`, merged from `design/s41-s42-profile-calendar`).

Purpose: top of the You tab after AMI-176 + AMI-182. Two changes to S41:
1. The four body chips (sex, age, height, weight) and the whole BODY section move behind one `Personal details` row (subtitle `Body, goal weight, units`, chevron) that opens a sheet.
2. A Goal timeline card sits directly under the profile card and opens S44. Compact 56pt chart: lime trend, today hairline, lavender estimate wedge to the dashed goal line, no labels.

Everything else (rank / strength tiles, AI credits, Training section) is unchanged from S41.

## Passes
1. Edit of S41 (`b9cad81ae0f74a35a8abdc6daaf8db6a`): chips and BODY section removed, Personal details row and goal card added, tab pill floating. Wedge too thin to read as a range.
2. Edit: chart redrawn so the wedge fans from the trend end to the goal line. First try returned "no screen produced"; one retry succeeded. Pass.

## Deviations
- Prompt subtitle changed to `Body, goal weight, units` (orchestrator instruction); `stitch/prompts/s45_profile_goal_card.md` updated to match.
- Compact chart is schematic: the trend slope is shallow and the wedge is narrow. Build uses `GoalChart` sparkline mode with real geometry.
- Training card shows S41's `Open coach →` link (kept from S41, not listed in the S45 prompt).
- Stitch kept the title "S41 — You / Profile (…)"; the folder name is the source of truth.

Files: `screen.png`, `code.html`, `stitch.json`.
