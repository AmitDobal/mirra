# S34 — Strength tier map

Output dir: `stitch_mirra_ai_personal_trainer/s34_strength_map` · Generate: `node scripts/stitch/generate.mjs generate --prompt-file stitch/prompts/s34_strength_map.md --out stitch_mirra_ai_personal_trainer/s34_strength_map`
Purpose: the user's own body, each muscle tinted with its strength tier, overall tier, and group list. Pushed screen (no tab bar). Male figure.

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
1. Top bar, 56pt tall: round 40pt back button (arrow-left icon, `#1c1b1b` fill) on the left; centered uppercase label `STRENGTH TIER` (on-surface-variant); nothing on the right.
2. Overall card (surface-container-low, radius 28, padding 20): left = Silver tier badge, size lg, 2 dots (division II). Right of it, stacked: uppercase label `OVERALL`, headline-lg `Silver II`, body-sm on-surface-variant `From 9 ranked lifts across 5 groups`.
3. Segmented control, full width, 44pt, dark track `#1c1b1b`: `Front` (active, white pill, dark text) | `Back` (inactive, on-surface-variant).
4. Anatomy figure, FRONT view, ~360pt tall, centered, on plain canvas. Tier tints: chest = Gold; front+side delts = Silver; biceps = Silver; traps = Silver; quads = Bronze; adductors, abs, obliques, forearms, calves = unranked (`#353534`).
5. Section header row: headline-sm `Muscle groups` left; lime text button `All tiers` with arrow-right icon on the right.
6. Six rows inside one surface-container-low card (radius 24), separated by 1px `#2a2a2a` dividers. Each row is 56pt: group name (body-lg, on-surface) on the left; on the right a sm badge followed by the label (label-lg). Rows exactly:
   - `Chest` · Gold badge (1 dot) · `Gold III`
   - `Back` · Silver badge (3 dots) · `Silver I`
   - `Shoulders` · Silver badge (1 dot) · `Silver III`
   - `Arms` · Silver badge (2 dots) · `Silver II`
   - `Legs` · Bronze badge (3 dots) · `Bronze I`
   - `Core` · no badge, a 24pt `#353534` hexagon outline · `Unranked` in on-surface-variant
7. 24pt bottom spacing. No bottom bar, no tab bar, no CTA.

## Strict rules
- Render ONLY the elements listed in Layout, in that order, with the EXACT text strings given (keep capitalization). Data values are exact; do not change numbers.
- Do NOT add: app-name headers ("Mirra Coach", "Athletic OS", version tags), "Live AI"/"verified" pills, extra metrics, percentages, charts, graphs, streak counters, XP, leaderboards, social or share buttons, avatars, timestamps, emojis, confetti, glow blobs, gradients beyond what is listed, marketing copy, or any section not listed.
- Do NOT invent new colors. Tier colors are allowed ONLY where this prompt lists them.
- If space remains, leave it as empty canvas. Do not fill it.
