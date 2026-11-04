# S46 — Progress tab with Goal timeline card

Output dir: `stitch_mirra_ai_personal_trainer/s46_progress_goal_card` · Generate: `node scripts/stitch/generate.mjs generate --prompt-file stitch/prompts/s46_progress_goal_card.md --out stitch_mirra_ai_personal_trainer/s46_progress_goal_card`
Purpose: Progress tab entry to S44. Same Goal timeline card as S45, placed above the existing weight journey card. Matches what `ProgressScreen.tsx` ships today (header, photo pair, weight journey), plus the card. Sample: day 35 of the S43/S44 user.

## Frame + system (do not deviate)
- One iPhone screen, 390 x 844 pt, dark mode only. Render the first screen of the scroll with the floating tab pill. Design system: **Kinetic Performance** (attached). Canvas `#131313`.
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
1. Caps lime label `MICROCYCLE`. Headline-lg on-surface `Progress Gallery`. Body-md on-surface-variant `4 check-ins · synced when online`.
2. Goal timeline card, identical to S45 item 2 (surface-container-low, radius 24, 16pt padding): caps lime `GOAL TIMELINE`, lime pill `On track` + chevron-right; headline-sm `82 → 75 kg · Steady`; body-sm `Around Feb 18 · range Feb 11 – Mar 6`; compact 56pt goal chart without labels.
3. Photo card (surface-container-low, radius 24, 16pt padding): caps label `CHECK-IN PHOTOS` left, caps label on-surface-variant with a small lock icon `PRIVATE` right; two equal rounded photo slots (radius 16, 4:5) with neutral grey silhouette placeholders, captions under them: label-md `Baseline` / body-sm `Nov 4`, and label-md `Current` / body-sm `Dec 9`; full-width lime pill 56pt `Compare your photos`.
4. Weight journey card (surface-container-low, radius 24, 16pt padding): caps label `WEIGHT JOURNEY`; display number in lime `79.4 kg`; two small stats side by side: `Since start` `−2.6 kg`, `To goal` `4.4 kg`; a small dot sparkline 72pt tall; full-width lime pill `Log weight`. This card may be cut off by the tab pill.
5. Floating white tab pill (64pt tall, ~300pt wide, centered, 24pt above the home indicator), five dark icons: home, dumbbell, fork-knife, chart (active, lime 42pt circle behind it), person. No labels.

## Strict rules
- Render ONLY the elements listed in Layout, in that order, with the EXACT text strings given (keep capitalization). Data values are exact; do not change numbers or dates.
- Do NOT add: app-name headers ("Mirra Engine", "S22"), "Microcycle 12" pills, lean mass, waist, body-fat %, BMI, "Biometric" anything, extra metrics, extra charts, XP, leaderboards, social or share buttons, emojis, confetti, glow blobs, gradients, marketing copy, or any section not listed.
- Do NOT invent new colors. No tier colors on this screen. No crimson.
- If space remains, leave it as empty canvas. Do not fill it.
