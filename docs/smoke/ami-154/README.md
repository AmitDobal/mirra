# AMI-154 smoke

- `smoke-output.txt`: `apps/api/scripts/smoke-streaks.mjs` against local `wrangler dev` (local D1 with migration 0015). Fresh = cold 0, check-in today = lit 1, 3-day run = 3 (best 3), re-post idempotent, `skipped` stops counting (at_risk, best kept), yesterday-only = at_risk, 3 days ago = cold, no auth = 401.
- `today-streak-fire-states.png`: the real `TodayHeader` + `StreakFireChip` rendered through react-native-web (no device build; system fonts, placeholder avatar ring). Lit (glow), at_risk (outline, dimmed flame), cold (muted). Crimson `#ff6b8a`, not orange.
- Offline: `npm run test:streaks -w @mirra/api`.
- Stitch S29 export: `stitch_mirra_ai_personal_trainer/s29_streak_fire/` (`code.svg` is the Stitch HTML file, which is an SVG flame; `screen.png` is the Stitch screenshot).
