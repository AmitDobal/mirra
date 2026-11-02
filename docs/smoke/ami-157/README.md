# AMI-157 — Exercise body map smoke

**Branch:** `feat/ami-157-body-map`  
**Stitch:** S31 male `c138b95284f84678afb4eeb6a884584f` · S32 female `ef5be6f4b8b84ce2842f5596d286411a`  
**Refs:** `stitch_mirra_ai_personal_trainer/s31_body_map/screen.png`, `s32_body_map_female/screen.png`

## Manual

1. Open **Exercise** tab → tap any library movement (or in-session exercise) → **Exercise detail**.
2. Confirm **Kinetic body map** card appears above **Target musculature**.
3. Profile **female** → label “Female physique”; **male / prefer not** → “Male physique”.
4. Primary regions render **crimson** (`#ff6b8a`); secondary **lime** (`primary-fixed`).
5. Barbell bench → chest/arms light; back squat / RDL → quads/glutes/hams.

## Automated

- `pnpm --filter mobile test muscle-regions` (region mapping unit test)
