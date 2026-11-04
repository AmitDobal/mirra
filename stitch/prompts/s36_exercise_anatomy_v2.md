# S36 — Exercise detail, anatomy v2 + tier card

Output dir: `stitch_mirra_ai_personal_trainer/s36_exercise_anatomy_v2` · Generate: `node scripts/stitch/generate.mjs generate --prompt-file stitch/prompts/s36_exercise_anatomy_v2.md --out stitch_mirra_ai_personal_trainer/s36_exercise_anatomy_v2`
Purpose: S26 exercise detail with a real front+back anatomy section (primary/secondary) placed above the steps, plus the user's tier for this lift. Keep S26 structure for the parts listed.

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

## Anatomy figure (reuse exactly)
- Realistic anatomical muscle-map figure: a standing human, arms slightly away from the body, drawn as separate flat muscle regions with thin `#0e0e0e` gaps between regions. Head, hands, feet and knees are plain `#2a2a2a` with no detail. No face, no skin texture, no glow, no grid behind it.
- Front view regions: traps, front+side delts, chest, biceps, triceps edge, forearms, abs, obliques, quads, adductors, calves.
- Back view regions: traps, rear delts, triceps, forearms, lats + upper back, lower back, glutes, hamstrings, calves.
- Unlisted or unranked regions are filled `#353534` at 55% opacity.

## Layout (top to bottom)
1. Hero image 260pt tall, full bleed, radius 0 at the top and 28 at the bottom, of a man doing a barbell bench press in a dark gym. Round 40pt back button top-left over the image. Nothing else on the image.
2. Uppercase lime label `PRIMARY MOVEMENT`, then headline-lg `Barbell Bench Press`.
3. Chip row: `Chest` (lavender fill), `Barbell` (dark chip), `Intermediate` (dark chip).
4. Prescription card (surface-container-low, radius 24): four equal columns with display-metric numbers and uppercase labels: `4` `SETS` | `8` `REPS` | `175` `LB TARGET` | `90s` `REST`.
5. Section label `MUSCLES WORKED` (uppercase). Under it one card (surface-container-low, radius 28, padding 16) containing two anatomy figures side by side, each ~250pt tall: left FRONT with caption `Front`, right BACK with caption `Back` (label-md, on-surface-variant, centered under each). Fills: chest = lime `#cbf150` (primary); front delts and triceps = lavender `#d1beef` (secondary); all other regions `#353534` at 55%.
6. Legend row inside the same card under the figures: lime dot + `Primary` (label-lg) + body-sm `Chest`; then a lavender dot + `Secondary` + body-sm `Front delts, Triceps`.
7. Tier card (surface-container-low, radius 24, padding 16): uppercase label `YOUR TIER`. Row: md Gold badge (1 dot), headline-sm `Gold III`, right-aligned label-md lime `60% to Gold II`. 6pt progress track `#2a2a2a` with lime fill to 60%. Body-md on-surface: `Next: 185 lb × 8 for 2 sessions → Gold II`.
8. Section label `EXECUTION PROTOCOL` and only the first step row: number chip `1`, title `Setup & Eye Alignment`, body `Lie flat with eyes directly beneath the bar. Plant feet firmly flat on the floor.` (cut off by the bottom bar).
9. Bottom action bar over a dark scrim: secondary pill `Swap` (dark, white text, 40% width) and primary lime pill `Add to session` (60% width), both 56pt tall.

## Strict rules
- Render ONLY the elements listed in Layout, in that order, with the EXACT text strings given (keep capitalization). Data values are exact; do not change numbers.
- Do NOT add: app-name headers ("Mirra Coach", "Athletic OS", version tags), "Live AI"/"verified" pills, extra metrics, percentages, charts, graphs, streak counters, XP, leaderboards, social or share buttons, avatars, timestamps, emojis, confetti, glow blobs, gradients beyond what is listed, marketing copy, or any section not listed.
- Do NOT invent new colors. Tier colors are allowed ONLY where this prompt lists them.
- If space remains, leave it as empty canvas. Do not fill it.
