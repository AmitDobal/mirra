# S35 — Muscle detail sheet

Output dir: `stitch_mirra_ai_personal_trainer/s35_muscle_detail` · Generate: `node scripts/stitch/generate.mjs generate --prompt-file stitch/prompts/s35_muscle_detail.md --out stitch_mirra_ai_personal_trainer/s35_muscle_detail`
Purpose: bottom sheet opened by tapping Chest on S34. Shows the tier, progress to the next division, the exact set that gets there, and contributing exercises.

## Frame + system (do not deviate)
- One iPhone screen, 390 x 844 pt, dark mode only. Design system: **Kinetic Performance** (attached). Canvas `#131313`.
- Colors only from these tokens: surface `#131313`, surface-container-lowest `#0e0e0e`, surface-container-low `#1c1b1b`, surface-container `#201f1f`, surface-container-high `#2a2a2a`, surface-container-highest `#353534`, outline-variant `#454936`, on-surface `#e5e2e1`, on-surface-variant `#c5c9b0`, lime primary-container `#cbf150` (text on lime `#161e00`), lavender secondary `#d1beef` (text on lavender `#21143a`), crimson streak `#ff6b8a`.
- Type: Space Grotesk for headlines, numbers, labels (uppercase labels tracked +0.08em, 11px). Plus Jakarta Sans for body. Headline-lg 28/34 700, headline-sm 18/24 600, body-md 14/20, body-sm 12/16.
- Shape: cards radius 24-28 with 1px `#2a2a2a` hairline, pills fully rounded, 20pt side margins, 16pt gutters. No drop shadows except the floating tab pill.
- iOS status bar at top (9:41). Home indicator at bottom.

## Tier colors (only for tier badges / tier tints)
Iron `#8f937c` · Bronze `#b9825f` · Silver `#c5c9d4` · Gold `#e8c15a` · Platinum `#8fd6cf` · Diamond `#9cc8ff` · Elite `#d1beef` · Legendary `#cbf150`.

## Tier badge (reuse exactly everywhere a "badge" is mentioned)
- A pointy-top rounded hexagon filled with the tier color, with a 2px darker inner bevel (same hue, 30% darker) and one simple white geometric glyph centered.
- Glyphs: Iron = one horizontal bar, Bronze = one chevron, Silver = two chevrons, Gold = three chevrons, Platinum = diamond outline, Diamond = faceted gem, Elite = five-point star, Legendary = small crown.
- Division pips: 1 to 3 small round dots in the tier color directly under the hexagon. Division III = 1 dot, II = 2 dots, I = 3 dots. Legendary has no dots and a thin lime laurel arc under it.
- Sizes: sm 24pt, md 40pt, lg 72pt.
- Badges are hexagons. Never circles (circles belong to a different feature).

## Layout (top to bottom)
1. Background: the S34 screen dimmed under a 60% black scrim (keep it recognizable but dark). Top 140pt visible.
2. Bottom sheet from y=140 to bottom: fill `#1c1b1b`, top radius 28, 36x4 grab handle `#454936` centered 8pt from the top.
3. Header row: md Gold badge (1 dot) on the left; stacked: uppercase label `CHEST`, headline-md `Gold III`. On the right a 36pt round close button (x icon).
4. Progress block: label-md row `Progress to Gold II` left and `60%` right (lime). Below it an 8pt full-width pill track `#2a2a2a` with a lime fill to 60%.
5. Next-set card (lime fill `#cbf150`, radius 24, padding 16, text `#161e00`): uppercase label `NEXT DIVISION`; display-metric `185 lb × 8`; body-md `Barbell Bench Press · 2 sessions → Gold II`.
6. Section label `CONTRIBUTING LIFTS` (uppercase, on-surface-variant).
7. Three rows, each 64pt, separated by 1px `#2a2a2a`. Left: exercise name (body-lg) and under it body-sm on-surface-variant detail. Right: sm badge plus label. Rows exactly:
   - `Barbell Bench Press` / `70% chest · best 175 lb × 8` / Gold badge 1 dot `Gold III`
   - `Incline Dumbbell Press` / `60% chest · best 60 lb × 10` / Silver badge 3 dots `Silver I`
   - `Push-up` / `65% chest · best bodyweight × 22` / Silver badge 2 dots `Silver II`
8. Footnote body-sm on-surface-variant: `Rest days never lower a tier.`

## Strict rules
- Render ONLY the elements listed in Layout, in that order, with the EXACT text strings given (keep capitalization). Data values are exact; do not change numbers.
- Do NOT add: app-name headers ("Mirra Coach", "Athletic OS", version tags), "Live AI"/"verified" pills, extra metrics, percentages, charts, graphs, streak counters, XP, leaderboards, social or share buttons, avatars, timestamps, emojis, confetti, glow blobs, gradients beyond what is listed, marketing copy, or any section not listed.
- Do NOT invent new colors. Tier colors are allowed ONLY where this prompt lists them.
- If space remains, leave it as empty canvas. Do not fill it.
