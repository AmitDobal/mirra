# AMI-162 — Real anatomy SVG (male/female, front/back) + tier visual primitives

**Wave 1** · parallel with AMI-161, AMI-163, AMI-164 · **Depends:** S37 tier colors approved by PM (DESIGN.md updated) · Arch §1, §2.1, §2.2

## Why
Today's body map is ellipse blobs, front view only. Its colors are swapped vs S31: Stitch uses lime for primary and lavender for secondary; code uses crimson + lime. Tiers need a per-muscle tint on real anatomy.

## Scope
1. Vendor path data from `react-native-body-highlighter` (MIT) into `features/anatomy/paths/{male-front,male-back,female-front,female-back}.ts`, one slug per line, with `LICENSE.md` (MIT text + source URL + commit SHA). Do not add the npm package.
2. `region-map.ts`: vendor slug → our muscle ids (§2.1 table). `MuscleId` is a local string-literal union matching the 18 ids exactly; AMI-168/169 switch it to the contracts import.
3. `AnatomyFigure.tsx` + `AnatomyPair.tsx` (§2.2 API). Modes: focus (primary `primary-container`, secondary `secondary`, passive `surface-container-highest`) and tier (`tier.*`). `onPressMuscle` returns the muscle ids of the tapped region. Accessibility label per region ("Chest, Gold II" / "Chest, primary").
4. Tier primitives: `features/strength-ui/tier-meta.ts` (tier ids, order, `tierOfStep`, `labelOfStep`; must equal arch §1) + `TierBadge.tsx` (hexagon, tier color, 1-3 division pips, Legendary crown; sizes sm 24 / md 40 / lg 72). Match S37.
5. `theme/tokens.ts`: add `tier` colors (`color.tier.iron` … `color.tier.legendary`, values from DESIGN.md after S37). Use them via StyleSheet / inline token refs. Do **not** add sx keys: AMI-164 owns `sx` this wave.
6. Rewrite `features/exercise/body-map/ExerciseBodyMap.tsx` internals to use `AnatomyPair` in focus mode. Map catalog muscle labels to the new ids (port the keyword table into `body-map/catalog-muscles.ts`). Keep the props unchanged so `ExerciseDetailScreen.tsx` is not edited. Delete `AnatomySilhouette.tsx` and the old region code; update `muscle-regions.test.ts`.

## File ownership
`apps/mobile/src/features/anatomy/**` (new) · `apps/mobile/src/features/strength-ui/**` (new) · `apps/mobile/src/features/exercise/body-map/**` · `apps/mobile/src/theme/tokens.ts`.

## Acceptance criteria
1. Dev preview route not needed. Smoke via `/exercise-detail?catalogId=barbell-bench-press` and `?catalogId=back-squat` (or the closest catalog ids): front + back figures render with real anatomy, male and female. Screenshots next to S31/S32 in `docs/smoke/ami-162/`.
2. Bench: chest lime; front delts + triceps lavender; everything else passive. Squat: quads + glutes lime (glutes visible on the back figure).
3. Tier mode is checked by a unit test (`features/anatomy/region-fill.test.ts`): `steps {chest: 10, lats: 3}` → chest region = gold token, back upper region = bronze/iron token per `tierOfStep`; unranked = passive.
4. `tierOfStep` covers all 22 steps; test asserts step 0 = Iron III, 9 = Gold III, 20 = Elite I, 21 = Legendary (division null).
5. TierBadge for each of the 8 tiers looks the same as the S37 export (one composite screenshot).
6. No hex outside `tokens.ts`. Path files ≤300 lines each. 60 fps on scroll in Exercise detail: no per-frame path recompute (memoize fills).

## Path index
`apps/mobile/src/features/exercise/body-map/*`, `features/exercise/ExerciseDetailScreen.tsx` (read only), `theme/tokens.ts`, `stitch_mirra_ai_personal_trainer/s31_body_map`, `s32_body_map_female`, `s37_tier_ladder` (after export).
