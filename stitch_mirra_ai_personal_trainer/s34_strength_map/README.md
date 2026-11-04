# S34 — Strength tier map

Stitch screen `cb154d3f761948cd9f3cc1afcaaf2fce` · project `16036285274438790381` · prompt `stitch/prompts/s34_strength_map.md`. Earlier drafts: `dca93ff5fbd548b09cc22da139644e4e` (generate), `5f9932d4d6a748eca77e7fba57f72bf7` (edit 1).

Purpose: You → Strength tier. Overall tier, front/back anatomy tinted by tier, muscle-group list.

Edit passes: 2 (anatomy realism, traps visibility).

Deviations accepted:
- Anatomy figure is still stylized/segmented, not medical-chart realistic. Build uses vendored `react-native-body-highlighter` paths (see `docs/03-engineering/strength-tiers-and-chat-diff.md` §2.1); take colors, layout and tints from here, not the figure shapes.
- Unranked regions render darker than `#353534` at 55%. Use the token value in code.
- Group-row pips sit beside the sm badge, not under it (fine at 24pt).

Files: `screen.png`, `code.html`, `stitch.json`.
