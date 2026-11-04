# S37 — Strength tier ladder

Output dir: `stitch_mirra_ai_personal_trainer/s37_tier_ladder` · Generate: `node scripts/stitch/generate.mjs generate --prompt-file stitch/prompts/s37_tier_ladder.md --out stitch_mirra_ai_personal_trainer/s37_tier_ladder`
Purpose: explains the 8 strength tiers and divisions and shows where the user is. Also the visual source for the tier badge set and tier colors.

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
1. Top bar 56pt: round 40pt back button left, centered uppercase label `TIERS`, nothing right.
2. Lime dot + uppercase lime label `STRENGTH LADDER`. Headline-lg `Strength Tiers`. Body-md on-surface-variant: `Tiers come from your logged working sets, compared with lifters of your sex and bodyweight. Rest days never lower a tier.`
3. Divisions explainer card (surface-container-low, radius 24): label `DIVISIONS` then three md Gold badges in a row with captions under them: 1 dot `Gold III`, 2 dots `Gold II`, 3 dots `Gold I`. Body-sm under the row: `Each tier has three divisions. III is the entry, I is the top.`
4. Eight tier rows, each a card (surface-container-low, radius 24, 72pt tall, 8pt apart), connected on the left by a thin vertical line `#454936` passing behind the badges. Each row: md badge (3 dots, except Legendary) left; tier name headline-sm; on the right a label-md text in on-surface-variant. Rows top to bottom, exactly:
   - Legendary badge · `Legendary` · `Top tier`
   - Elite badge · `Elite` · `III · II · I`
   - Diamond badge · `Diamond` · `III · II · I`
   - Platinum badge · `Platinum` · `III · II · I`
   - Gold badge · `Gold` · `III · II · I`
   - Silver badge · `Silver` · `You · Silver II`. This row is highlighted: 1.5pt lime border, and the right text is a lime pill with dark text.
   - Bronze badge · `Bronze` · `III · II · I`
   - Iron badge · `Iron` · `III · II · I`
5. Bottom spacing 32pt. No CTA, no tab bar.

## Strict rules
- Render ONLY the elements listed in Layout, in that order, with the EXACT text strings given (keep capitalization). Data values are exact; do not change numbers.
- Do NOT add: app-name headers ("Mirra Coach", "Athletic OS", version tags), "Live AI"/"verified" pills, extra metrics, percentages, charts, graphs, streak counters, XP, leaderboards, social or share buttons, avatars, timestamps, emojis, confetti, glow blobs, gradients beyond what is listed, marketing copy, or any section not listed.
- Do NOT invent new colors. Tier colors are allowed ONLY where this prompt lists them.
- If space remains, leave it as empty canvas. Do not fill it.
