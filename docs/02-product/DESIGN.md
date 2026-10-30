# Design System: Mirra

**Source of truth (do not fork):**  
`stitch_mirra_ai_personal_trainer/kinetic_performance/DESIGN.md`  
+ per-screen `stitch_mirra_ai_personal_trainer/sXX_*/screen.png` + `code.html`

Builders implement **same-to-same** with those exports (colors, type, radii, components, assets). This file is a short pointer + engineering mapping only.

## Map Stitch → Expo

| Stitch | App |
| --- | --- |
| YAML colors / type / rounded / spacing | `apps/mobile/src/theme/tokens.ts` |
| Space Grotesk + Plus Jakarta Sans | expo-font / loaded fonts |
| Floating white pill tab | `src/ui/TabDock.tsx` |
| Lime `#D8FF5C` / lavender `#C3B1E1` / canvas `#121212` | theme tokens — **no hex in screens** |
| Athlete images in HTML | download into `apps/mobile/assets/stitch/` once |

## Rules

1. If unsure of spacing/radius/color → open matching `screen.png`, not this summary.
2. Do not reintroduce warm paper + olive.
3. Assets used in Stitch HTML must be the ones shipped (or legally replaced 1:1).
4. Copy budget still applies — visual density from Stitch, not text walls.

## Canonical tokens (from Stitch — verify in DESIGN.md)

- Background `#131313` / `#121212`
- Primary container lime `#cbf150` / accent `#D8FF5C` (use Stitch file as exact)
- Secondary lavender `#d1beef` / `#C3B1E1`
- Type: Space Grotesk (display) + Plus Jakarta Sans (body)
