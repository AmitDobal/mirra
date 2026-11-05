# S45 — You / Profile with Goal timeline card (edit of S41)

Output dir: `stitch_mirra_ai_personal_trainer/s45_profile_goal_card` · Generate: edit the S41 screen (`fae59e7ff5654122b3ce5935c3c4b850`, branch `design/s41-s42-profile-calendar`) with this prompt, or `node scripts/stitch/generate.mjs generate --prompt-file stitch/prompts/s45_profile_goal_card.md --out stitch_mirra_ai_personal_trainer/s45_profile_goal_card`
Purpose: top of the You tab after AMI-176 + AMI-182. Two changes to S41: (1) the body chips and the BODY section move behind one "Personal details" row (sheet), (2) a new Goal timeline card sits directly under the profile card and opens S44. Everything below the first section label stays exactly as S41. Sample: day 35 of the S43/S44 user.

## Frame + system (do not deviate)
- One iPhone screen, 390 x 844 pt, dark mode only. Render only the first screen of the scroll (top of the page), with the floating tab pill. Design system: **Kinetic Performance** (attached). Canvas `#131313`.
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

## Row pattern (same as S41)
Row 52pt tall inside a section card, 16pt inner padding. Left: label in body-md on-surface. Right: value in body-md on-surface-variant, then a 16pt chevron-right in on-surface-variant.

## Layout (top to bottom)
NO header bar, NO title row, NO refresh button: the page starts with the profile card 12pt under the status bar.
1. Profile card (surface-container-low, radius 28, 20pt padding), exactly S41 but WITHOUT the row of four chips: 64pt circle avatar with a 2pt lime ring, initials `AC` in headline-sm on surface-container-highest; right of it name `Alex Chen` (headline-md on-surface) with a small lime pill `PRO` (9px bold, text `#161e00`); below `alex.chen@gmail.com` (body-sm on-surface-variant).
2. Goal timeline card (surface-container-low, radius 24, 16pt padding, 12pt below the profile card):
   - Row: caps lime label `GOAL TIMELINE` left; right side a small lime pill (label-md, text `#161e00`) `On track` followed by a 16pt chevron-right in on-surface-variant.
   - Headline-sm on-surface `82 → 75 kg · Steady`. Body-sm on-surface-variant `Around Feb 18 · range Feb 11 – Mar 6`.
   - Goal chart, compact 56pt tall, full card width, NO axis labels, NO legend, NO goal label text: lime trend line on the left third ending at a `#454936` vertical hairline (no `Today` text), then the lavender estimate wedge fanning right to the dashed goal hairline.
3. Two tiles side by side, exactly as S41: left `KINETIC RANK` / `Spark` / `Best streak 9 · Spark → Apex`; right `STRENGTH TIER` / `Locked · 3/8` / `Every muscle ranked Iron → Legendary`.
4. AI credits card, exactly as S41: `AI CREDITS`, `312 of 400 AI credits left · resets Dec 1`, lime track at 78%, `88 used this month`.
5. Card with one row (row pattern, but two lines on the left): label `Personal details`, under it body-sm on-surface-variant `Body, goal weight, units`; chevron right. No value text.
6. Section label `TRAINING` and the top edge of the S41 training card (caps `ACTIVE PLAN`, label-md lime `Week of Nov 3`), cut off by the tab pill.
7. Floating white tab pill (64pt tall, ~300pt wide, centered, 24pt above the home indicator), five dark icons: home, dumbbell, fork-knife, chart, person (active, lime 42pt circle behind it). No labels.

## Strict rules
- Render ONLY the elements listed in Layout, in that order, with the EXACT text strings given (keep capitalization). Data values are exact; do not change numbers or dates.
- Do NOT add: a page title, app-name headers, a refresh button, body chips (`Male`, `29 yrs`, height, weight) anywhere on this screen, a `BODY` section, "verified" badges, member-since dates, BMI, body-fat %, extra metrics, extra charts, XP, leaderboards, social or share buttons, emojis, confetti, glow blobs, gradients, marketing copy, or any section not listed.
- Do NOT invent new colors. No tier colors on this screen. No crimson.
- If space remains, leave it as empty canvas. Do not fill it.
