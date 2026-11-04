# S44 — Goal timeline screen

Output dir: `stitch_mirra_ai_personal_trainer/s44_goal_timeline` · Generate: `node scripts/stitch/generate.mjs generate --prompt-file stitch/prompts/s44_goal_timeline.md --out stitch_mirra_ai_personal_trainer/s44_goal_timeline`
Purpose: full goal screen opened from the You goal card (S45) and the Progress card (S46). Actual weight trend against the estimate range, ETA, milestones, and what keeps the user on track. Arch: `docs/03-engineering/goal-timeline.md` §3, §7. Sample: same user as S43 on day 35 (Dec 9 2026): trend 79.6 kg, on track, estimate moved up from Mar 6 to Feb 18.

## Frame + system (do not deviate)
- One iPhone screen, 390 pt wide, dark mode only, tall scrolling page (render the full scroll height). Design system: **Kinetic Performance** (attached). Canvas `#131313`.
- Colors only from these tokens: surface `#131313`, surface-container-lowest `#0e0e0e`, surface-container-low `#1c1b1b`, surface-container `#201f1f`, surface-container-high `#2a2a2a`, surface-container-highest `#353534`, outline-variant `#454936`, on-surface `#e5e2e1`, on-surface-variant `#c5c9b0`, lime primary-container `#cbf150` (text on lime `#161e00`), lavender secondary `#d1beef` (text on lavender `#21143a`).
- Type: Space Grotesk for headlines, numbers, labels (uppercase labels 11px 700 tracked +0.08em). Plus Jakarta Sans for body. Headline-lg 28/34 700, headline-md 22/28 600, headline-sm 18/24 600, body-md 14/20, body-sm 12/16, label-md 12/16 600.
- Shape: cards radius 24 with 1px `#2a2a2a` hairline, pills fully rounded, 20pt side margins, 16pt gutters, 28pt between sections. No drop shadows except the floating tab pill. No gradients.
- iOS status bar at top (9:41). Home indicator at bottom.

## Chart style (reuse exactly wherever a "goal chart" is mentioned)
- Flat line chart on the card surface, no grid except the lines listed. Y axis: only two small labels on the left in label-md on-surface-variant (the start weight at the top, the goal weight at the bottom). X axis: month labels in uppercase 11px on-surface-variant along the bottom.
- Estimate range: ONE soft lavender `#d1beef` filled wedge at 16% opacity. It starts as a single point at the left (start weight, start date) and fans out to the right: its upper edge reaches the goal line at the later date, its lower edge reaches the goal line at the earlier date.
- Expected line: a 2pt dashed lavender `#d1beef` line through the middle of the wedge, ending on the goal line at the expected date with a small lavender dot.
- Goal line: a 1pt dashed horizontal hairline `#454936` at the goal weight, with a small label at its right end in label-md on-surface-variant.
- Actual data (only when the prompt says so): small 4pt dots in on-surface-variant for weigh-ins, and a 2.5pt solid lime `#cbf150` trend line through them, ending at a 1pt vertical `#454936` hairline labelled `Today` (uppercase 11px on-surface-variant) at the top.
- No other lines, no area fill under the trend, no tooltips, no axis titles.

## Layout (top to bottom)
1. Top bar 56pt: round 40pt back button left (surface-container-high, chevron-left), centered uppercase label `GOAL`, round 40pt more button right (three horizontal dots).
2. Lime 6pt dot + uppercase lime label `LOSE FAT · STEADY`. Then one row: headline-lg on-surface `Around Feb 18` and, right of it, a small lime pill (text `#161e00`, label-md) `On track`. Below: body-md on-surface-variant `Range Feb 11 – Mar 6 · moved up from Mar 6`.
3. Chart card (surface-container-low, radius 24, 16pt padding):
   - Row: caps label `WEIGHT TREND` left; label-md on-surface-variant `Last 5 weeks` right.
   - Goal chart, 190pt tall: Y labels `82` (top) and `75` (bottom). X labels `NOV DEC JAN FEB MAR`. Estimate wedge starts at the `Today` hairline (about one third from the left, early December) at 79.6 and fans right: lower edge meets the goal line under `FEB` (Feb 11), upper edge meets it under `MAR` (Mar 6). Expected dashed line meets the goal line between them (Feb 18) with a lavender dot. Goal line label `Goal 75 kg`. Actual data left of the hairline: six grey weigh-in dots at 82.0, 81.4, 81.1, 80.3, 80.0, 79.4 (Nov 4 to Dec 9) and the lime trend line from 82.0 down to 79.6 ending at the `Today` hairline.
   - Legend row under the chart, body-sm on-surface-variant, 16pt gaps: short lime line `Trend` · grey dot `Weigh-ins` · small lavender square at 40% `Estimate range`.
4. Three equal stat tiles in a row (surface-container-low, radius 20, 12pt padding, 8pt gutters). Each: caps label on-surface-variant, headline-sm on-surface value, body-sm on-surface-variant detail:
   `START` / `82.0 kg` / `Nov 4` · `NOW` / `79.6 kg` / `7-day trend` · `TO GO` / `4.6 kg` / `−2.4 kg so far`
5. Section label `MILESTONES`. Card (surface-container-low, radius 24) with five 56pt rows joined on the left by a thin vertical `#454936` line through 10pt hollow lavender circles. Each row: title body-md on-surface, detail body-sm on-surface-variant, date label-md on-surface right-aligned.
   - `First visible change` / `Often around here · −2.5 kg` / `Dec 10`
   - `Bench press Silver I` / `80 kg × 8 for 2 sessions` / `Dec 16` (instead of a circle this row has a 24pt pointy-top rounded silver hexagon `#c5c9d4` with a 2pt `#878b96` bevel, a white two-chevron glyph, and three tiny silver dots under it)
   - `Halfway` / `78.5 kg` / `Dec 26`
   - `5% of start` / `77.9 kg` / `Jan 4`
   - `Goal` / `75 kg` / `Feb 18` (circle filled lime)
6. Section label `STAY ON TRACK`. Card (surface-container-low, radius 24, 16pt padding): caps label on-surface-variant `LAST 28 DAYS`, then three rows, each: label body-md on-surface left, value label-md on-surface right, and under it a 6pt rounded track (surface-container-highest) with a lime fill:
   `Sessions` `10 / 12` (83%) · `Check-ins` `20 / 28` (71%) · `Fuel on target` `11 / 16 logged days` (69%).
   Then a 1px `#454936` 30% divider and body-md on-surface: `Keep 4 of 4 sessions this week to hold Feb 18.`
7. Full-width lime pill button 56pt: scale icon + label-lg `Log weight`. Below it, a full-width secondary pill 48pt (surface-container-high, 1px `#2a2a2a`, on-surface text) `Edit goal`.
8. Body-sm 11px on-surface-variant centered: `Estimate based on your pace, logs and plan. Not medical advice.`
9. 32pt bottom spacing. No tab bar.

## Strict rules
- Render ONLY the elements listed in Layout, in that order, with the EXACT text strings given (keep capitalization). Data values are exact; do not change numbers or dates.
- Do NOT add: app-name headers ("Mirra Engine", version tags), "AI" or "verified" pills, body-fat %, BMI, lean mass, waist, calories burned, heart rate, photos, avatars, extra metrics, extra charts or rings, XP, leaderboards, social or share buttons, emojis, confetti, glow blobs, gradients, guarantees ("guaranteed", "you will"), marketing copy, or any section not listed.
- Do NOT invent new colors. The silver hexagon is the ONLY tier color on this screen. No crimson.
- If space remains, leave it as empty canvas. Do not fill it.
