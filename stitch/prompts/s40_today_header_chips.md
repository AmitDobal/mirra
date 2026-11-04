# S40 — Today header: streak + Kinetic rank chips (new-user state)

Output dir: `stitch_mirra_ai_personal_trainer/s40_today_header_chips` · Generate: `node scripts/stitch/generate.mjs generate --prompt-file stitch/prompts/s40_today_header_chips.md --out stitch_mirra_ai_personal_trainer/s40_today_header_chips`
Purpose: fixes the crowded Today header. Shows the zero-streak chip and the locked Kinetic rank chip for a brand-new user. Same Today screen as S15c below the header.

## Frame + system (do not deviate)
- One iPhone screen, 390 x 844 pt, dark mode only. Design system: **Kinetic Performance** (attached). Canvas `#131313`.
- Colors only from these tokens: surface `#131313`, surface-container-lowest `#0e0e0e`, surface-container-low `#1c1b1b`, surface-container `#201f1f`, surface-container-high `#2a2a2a`, surface-container-highest `#353534`, outline-variant `#454936`, on-surface `#e5e2e1`, on-surface-variant `#c5c9b0`, lime primary-container `#cbf150` (text on lime `#161e00`), lavender secondary `#d1beef` (text on lavender `#21143a`), crimson streak `#ff6b8a`.
- Type: Space Grotesk for headlines, numbers, labels (uppercase labels tracked +0.08em, 11px). Plus Jakarta Sans for body. Headline-lg 28/34 700, headline-sm 18/24 600, body-md 14/20, body-sm 12/16.
- Shape: cards radius 24-28 with 1px `#2a2a2a` hairline, pills fully rounded, 20pt side margins, 16pt gutters. No drop shadows except the floating tab pill.
- iOS status bar at top (9:41). Home indicator at bottom.


## Layout (top to bottom)
1. Header row, 56pt, 20pt side margins, items vertically centered, 8pt gaps:
   - Left: dark pill (surface-container-high) with a 6pt lime dot + uppercase label `TODAY`.
   - Flexible empty space (NO microcopy text here).
   - Rank chip, locked: dark pill (surface-container-high, 1px `#454936` border), small lock icon in on-surface-variant + label-md on-surface-variant `Spark 0/7`.
   - Streak chip, zero state: transparent pill with 1px `#454936` border, an outlined flame icon in `#8f937c` (no fill, no glow) + label-md on-surface-variant `0`.
   - Bell icon button, 40pt round, no badge.
   - Avatar 44pt circle with a 2pt lime ring (neutral grey placeholder silhouette inside).
2. Week strip card (surface-container-low, radius 28): letters `M T W T F S S` with dates `2 3 4 5 6 7 8`; `W 4` is the active day (lime circle, dark number).
3. Today's focus card (lime fill, radius 28): small dark pill `TODAY'S FOCUS`; headline-lg dark `Push Day`; body-md dark `3 exercises`; dark pill button `Start Workout`; lime-dark ghost pill `Swap`; a rounded photo of a man training on the right with a `45m` label.
4. Floating white tab pill (64pt tall, ~300pt wide, centered, 24pt above the home indicator), five dark icons: home (active, lime 42pt circle behind it), dumbbell, fork-knife, chart, person. No labels.

## Second state (run as an edit on the generated screen, save as `s40_today_header_chips/streak9`)
Edit prompt: "Change only the two header chips. Rank chip unlocked: no lock icon, lavender text `Spark` (on-secondary-container `#c2b0e0`). Streak chip lit: crimson `#ff6b8a` 15% fill, 1px crimson 40% border, filled crimson flame, crimson text `9`. Change nothing else."

## Strict rules
- Render ONLY the elements listed in Layout, in that order, with the EXACT text strings given (keep capitalization). Data values are exact; do not change numbers.
- Do NOT add: app-name headers ("Mirra Coach", "Athletic OS", version tags), "Live AI"/"verified" pills, extra metrics, percentages, charts, graphs, streak counters, XP, leaderboards, social or share buttons, avatars, timestamps, emojis, confetti, glow blobs, gradients beyond what is listed, marketing copy, or any section not listed.
- Do NOT invent new colors. Tier colors are allowed ONLY where this prompt lists them.
- If space remains, leave it as empty canvas. Do not fill it.
