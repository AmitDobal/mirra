# S38 — Workout complete with tier-up

Output dir: `stitch_mirra_ai_personal_trainer/s38_workout_complete_tier_up` · Generate: `node scripts/stitch/generate.mjs generate --prompt-file stitch/prompts/s38_workout_complete_tier_up.md --out stitch_mirra_ai_personal_trainer/s38_workout_complete_tier_up`
Purpose: S17 workout complete, plus a Tier up block when the session moved tiers. Keep S17 header and stats; drop S17 items not listed.

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
1. Top row: round 40pt close button (x) on the left; centered uppercase label `WORKOUT COMPLETE`.
2. Centered lime check circle (64pt, lime fill, dark check). Headline-lg `Session Logged`. Body-md on-surface-variant `Push Day completed.`
3. Stats row of three equal tiles (surface-container-low, radius 20): `42` / `MINUTES`, `8.4k` / `LB VOLUME`, `5` / `EXERCISES` (display-metric number, uppercase label).
4. Tier up card (surface-container-low, radius 28, 1.5pt lime border, padding 16):
   - Header row: uppercase lime label `TIER UP` and on the right body-sm on-surface-variant `3 changes`.
   - Overall row (72pt): lg Silver badge (2 dots) left; stacked: uppercase label `OVERALL`, headline-md `Silver II`, body-sm on-surface-variant `from Silver III`.
   - Divider 1px `#2a2a2a`.
   - Two compact rows (56pt): sm badge, name (body-lg), right-aligned label-lg transition text with an arrow:
     - Gold badge 1 dot · `Chest` · `Silver I → Gold III`
     - Gold badge 1 dot · `Barbell Bench Press` · `Silver I → Gold III`
5. RPE block exactly as S17: label `How hard was it?`, a row of ten 32pt round chips `1`..`10` (chip `7` lime filled), body-sm row `Light` left / `Max` right.
6. Bottom: full-width lime pill `Done`, 56pt.

## Strict rules
- Render ONLY the elements listed in Layout, in that order, with the EXACT text strings given (keep capitalization). Data values are exact; do not change numbers.
- Do NOT add: app-name headers ("Mirra Coach", "Athletic OS", version tags), "Live AI"/"verified" pills, extra metrics, percentages, charts, graphs, streak counters, XP, leaderboards, social or share buttons, avatars, timestamps, emojis, confetti, glow blobs, gradients beyond what is listed, marketing copy, or any section not listed.
- Do NOT invent new colors. Tier colors are allowed ONLY where this prompt lists them.
- If space remains, leave it as empty canvas. Do not fill it.
