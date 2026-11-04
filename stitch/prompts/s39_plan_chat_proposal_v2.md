# S39 — Plan chat proposal v2 (meal + exercise before/after)

Output dir: `stitch_mirra_ai_personal_trainer/s39_plan_chat_proposal_v2` · Generate: `node scripts/stitch/generate.mjs generate --prompt-file stitch/prompts/s39_plan_chat_proposal_v2.md --out stitch_mirra_ai_personal_trainer/s39_plan_chat_proposal_v2`
Purpose: S28 proposal card with real before/after for a meal swap and an exercise swap, plus a preference row. Every value shown is the real data the user will get after Apply.

## Frame + system (do not deviate)
- One iPhone screen, 390 x 844 pt, dark mode only. Design system: **Kinetic Performance** (attached). Canvas `#131313`.
- Colors only from these tokens: surface `#131313`, surface-container-lowest `#0e0e0e`, surface-container-low `#1c1b1b`, surface-container `#201f1f`, surface-container-high `#2a2a2a`, surface-container-highest `#353534`, outline-variant `#454936`, on-surface `#e5e2e1`, on-surface-variant `#c5c9b0`, lime primary-container `#cbf150` (text on lime `#161e00`), lavender secondary `#d1beef` (text on lavender `#21143a`), crimson streak `#ff6b8a`.
- Type: Space Grotesk for headlines, numbers, labels (uppercase labels tracked +0.08em, 11px). Plus Jakarta Sans for body. Headline-lg 28/34 700, headline-sm 18/24 600, body-md 14/20, body-sm 12/16.
- Shape: cards radius 24-28 with 1px `#2a2a2a` hairline, pills fully rounded, 20pt side margins, 16pt gutters. No drop shadows except the floating tab pill.
- iOS status bar at top (9:41). Home indicator at bottom.


## Layout (top to bottom)
1. Top bar 56pt: round 40pt back button left; centered headline-sm `Plan chat`; nothing on the right.
2. User bubble, right-aligned (surface-container-high, radius 24): `Swap my lunch and replace tricep dips with skull crushers. No chicken.`
3. Coach reply, left, with a 32pt lime circle avatar showing the letter `M` (dark text), bubble surface-container-low: `Here is the change. Nothing updates until you apply.`
4. Proposal card (surface-container-low, radius 28, 1.5pt lime border on the left edge and top, padding 20):
   - Header: 36pt dark circle with a sliders icon; headline-md `Proposed changes`; under it uppercase label `READY TO APPLY`.
   - Section label with dumbbell icon, lavender uppercase: `WORKOUT REVISION`. Under it body-sm on-surface-variant: `Thu · Push day`.
   - Diff block (surface-container-lowest, radius 24, padding 14):
     a. Line 1: minus icon + struck-through on-surface-variant text `Before: Tricep Dips · 3×8-10`.
     b. Small lime swap arrows icon with a 1px divider line.
     c. Line 2: lime check-circle icon + lime label-lg `After: Skull Crusher · 3×8-10`; on the right a lavender-outline pill `Same muscles`.
     d. Line 3: body-sm on-surface `↳ Trains triceps without a dip station`.
   - Section label with fork-knife icon, lavender uppercase: `MEAL ADJUSTMENT`.
   - Diff block, same style:
     a. Struck line `Before: Lunch · Chicken Caesar wrap`, with a dark pill on the right `640 kcal`.
     b. Swap arrows divider.
     c. Lime line `After: Lunch · Salmon rice bowl`, with a lavender-outline pill on the right `Target intact`.
     d. `↳ +12g protein · −20g carbs · 610 kcal`.
   - Section label with sliders icon, lavender uppercase: `PLAN PREFERENCES`.
   - One compact row (no before line): lime check-circle + label-lg `Avoid: chicken`.
   - Divider, then body-md `Apply these to your plan?`
   - Two buttons side by side, 52pt: outline lavender pill with a pencil icon `Change it`; lime filled pill with a check icon `Yes, apply`.
5. Composer pinned at the bottom: dark pill input with placeholder `Reply after you decide…` and a lock icon, a 48pt mic circle and a 48pt send circle (both `#1c1b1b`).

## Strict rules
- Render ONLY the elements listed in Layout, in that order, with the EXACT text strings given (keep capitalization). Data values are exact; do not change numbers.
- Do NOT add: app-name headers ("Mirra Coach", "Athletic OS", version tags), "Live AI"/"verified" pills, extra metrics, percentages, charts, graphs, streak counters, XP, leaderboards, social or share buttons, avatars, timestamps, emojis, confetti, glow blobs, gradients beyond what is listed, marketing copy, or any section not listed.
- Do NOT invent new colors. Tier colors are allowed ONLY where this prompt lists them.
- If space remains, leave it as empty canvas. Do not fill it.
