# S43 — Onboarding: Your timeline + commit

Output dir: `stitch_mirra_ai_personal_trainer/s43_onboarding_timeline` · Generate: `node scripts/stitch/generate.mjs generate --prompt-file stitch/prompts/s43_onboarding_timeline.md --out stitch_mirra_ai_personal_trainer/s43_onboarding_timeline`
Purpose: last onboarding screen after S12 week reveal, before sign-in / paywall. Shows what the user picked, an estimated timeline chart to their goal, and a hold-to-commit pledge. Arch: `docs/03-engineering/goal-timeline.md` §7. Sample: male, 82 kg → 75 kg, Steady pace, 4 days, start Nov 4 2026.

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
1. Top bar 56pt: round 40pt back button left (surface-container-high, chevron-left), centered uppercase label `YOUR TIMELINE` in on-surface-variant, nothing right.
2. Lime 6pt dot + uppercase lime label `BASED ON YOUR ANSWERS`. Headline-lg on-surface, two lines: `82 → 75 kg,` / `around Mar 6`. Body-md on-surface-variant: `If you follow your plan, this is roughly when you get there. Mirra updates it every time you log your weight.`
3. Chart card (surface-container-low, radius 24, 16pt padding):
   - Row: caps label `PROJECTED WEIGHT` left; label-md lavender `Steady · ~0.5 kg / week` right.
   - Goal chart, 150pt tall: Y labels `82` (top) and `75` (bottom). X labels `NOV DEC JAN FEB MAR APR`. Estimate wedge from 82 at the left edge (Nov 4); its lower edge meets the goal line under `FEB` (Feb 16), its upper edge meets it near the right end under `APR` (Apr 26). Expected dashed line meets the goal line under `MAR` (Mar 6) with a lavender dot. Goal line label `Goal 75 kg`. A single 8pt lime dot at the left start point with a tiny label `Today 82 kg` above it. NO actual data, NO trend line, NO `Today` hairline.
   - 16pt below: three equal columns separated by 1px `#454936` vertical dividers. Each: caps label on-surface-variant, then headline-sm on-surface. `EXPECTED` / `Mar 6` · `RANGE` / `Feb 16 – Apr 26` · `WEEKS` / `~18`.
4. Section label `MILESTONES`. Card (surface-container-low, radius 24) with three 52pt rows joined on the left by a thin vertical `#454936` line through 10pt hollow lavender circles. Each row: title body-md on-surface, detail body-sm on-surface-variant, date label-md on-surface right-aligned.
   - `First visible change` / `Often around here · −2.5 kg` / `Dec 16`
   - `Halfway` / `78.5 kg` / `Jan 3`
   - `Goal` / `75 kg` / `Mar 6` (this circle is filled lime)
5. Section label `WHAT YOU PICKED`. Card (surface-container-low, radius 24) with 52pt rows (label body-md on-surface left, value body-md on-surface-variant right, no chevrons, 1px `#454936` 30% dividers):
   `Goal` → `Lose fat` · `Weight` → `82 → 75 kg` · `Pace` → `Steady · ~0.5 kg / week` · `Training` → `4 days · 45 min` · `Experience` → `Some months` · `Daily fuel` → `2,250 kcal · 150 g protein`
   Under the card, a right-aligned lime label-md text link `Edit answers`.
6. One row, centered: lime trending-up icon + body-md on-surface-variant `Hit 4 of 4 sessions every week: around Feb 16.`
7. Commit block (16pt above the button): body-md on-surface centered `I commit to my 4 sessions this week.` Then a full-width lime pill button 56pt tall: a fingerprint icon + label-lg `Hold to commit` (text `#161e00`). Show the press-progress state: the left 40% of the pill is a slightly darker lime fill (`#b0d434`), the rest normal lime.
8. Centered ghost text button label-lg on-surface-variant `Not now`, 44pt tall.
9. Body-sm 11px on-surface-variant centered: `Estimate based on your pace and plan. Not medical advice.`
10. 32pt bottom spacing. No tab bar.

## Strict rules
- Render ONLY the elements listed in Layout, in that order, with the EXACT text strings given (keep capitalization). Data values are exact; do not change numbers or dates.
- Do NOT add: app-name headers ("Mirra Engine", version tags), "AI" or "verified" pills, body-fat %, BMI, calories burned, heart rate, before/after photos, extra metrics, extra charts, percentages, streaks, XP, leaderboards, social or share buttons, avatars, testimonials, social proof, emojis, confetti, glow blobs, gradients, guarantees ("guaranteed", "you will"), marketing copy, or any section not listed.
- Do NOT invent new colors. No tier colors on this screen. No crimson.
- If space remains, leave it as empty canvas. Do not fill it.
