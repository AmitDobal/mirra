# AMI-158 — Streak + Kinetic chip padding (S29)

**Branch:** `feat/ami-158-streak-chip-padding`  
**Stitch:** `stitch_mirra_ai_personal_trainer/s29_streak_fire/` (`stitch-s29-flame-ref.png`)

## Change

- `StreakFireChip`: `px-3 py-2`, `gap-1.5`, `FlameIcon` in `p-1` wrapper (header-scale echo of `StreakRankHero` `p-2`).
- `KineticRankChip`: matching `px-3 py-2`.

## Manual (390 px)

1. Today tab with rank unlocked + lit streak (dev session / day-test).
2. Header row: rank chip, fire chip, bell, avatar — no horizontal overflow; flame not flush to chip border.
3. Compare chip rhythm to `stitch-s29-flame-ref.png` and AMI-154 chip states baseline.

## Automated

- `node apps/mobile/scripts/check-sx.mjs`
- `pnpm --filter @mirra/mobile typecheck`
