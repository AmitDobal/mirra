# AMI-168 — Strength map, muscle detail, tier ladder screens (S34/S35/S37)

**Wave 3** · parallel with AMI-169 · **Depends:** AMI-162, AMI-165 merged; S34, S35, S37 approved · Arch §1, §2.2, §6.5, §7

## Why
"Every user body part gets a tier." This ticket builds the user's body tinted by tier per muscle, tap-to-drill, and the ladder that explains the tiers.

## Scope
1. `lib/api/strength.ts` (+ TanStack Query hooks `useStrength`, `useMuscleStrength`) over `GET /v1/strength*`. Types from `@mirra/contracts`.
2. `app/strength.tsx` → `features/strength/StrengthMapScreen.tsx` (S34):
   - header "Strength tier";
   - overall TierBadge lg + label, or the locked state "Rank 8 lifts across 5 groups to unlock · 3/8";
   - Front/Back segmented toggle;
   - `AnatomyFigure` in tier mode (sex from profile);
   - 6 group rows (group name, TierBadge sm, label or "Unranked");
   - "See all tiers" → ladder.
3. Muscle detail bottom sheet (S35), opened by tapping a region or a muscle row:
   - muscle name, TierBadge md, label, progress bar to next division;
   - next target "185 lb × 8 for 2 sessions → Gold I";
   - contributing exercises list (name, involvement %, best set, label).
   - Unranked muscle: "Log a lift that trains <muscle> to rank it".
4. `app/strength-ladder.tsx` → `TierLadderScreen.tsx` (S37): 8 tiers top to bottom, Legendary first, with division labels and the user's current overall tier highlighted. Copy from `src/content/strength.ts`, no percentile claims beyond "Top 3%" for Legendary.
5. Entry point: You tab card "Strength tier" (TierBadge + overall label, or "Locked · 3/8") → `/strength`. `YouScreen.tsx` is 315 lines: extract the card list into `features/you/YouCards.tsx` first, then add `StrengthTeaser.tsx`.
6. Switch the anatomy `MuscleId` local union to `@mirra/contracts` `MuscleId` (one-line edit in `features/anatomy/region-map.ts`).

## File ownership
`apps/mobile/app/{strength,strength-ladder}.tsx` (new), `app/_layout.tsx` (two `Stack.Screen` lines) · `apps/mobile/src/features/strength/**` (new) · `apps/mobile/src/features/you/{YouScreen,YouCards,StrengthTeaser}.tsx` · `apps/mobile/src/lib/api/strength.ts` (new) · `apps/mobile/src/content/strength.ts` (new) · `features/anatomy/region-map.ts` (type import only) · lock: lib/api index.

## Acceptance criteria
1. Seeded user from AMI-165 AC2: map tints chest/quads/lats with their tier colors. Core is dark. Back toggle shows lats/glutes tints. Overall locked "4/8".
2. Tap chest → sheet shows the tier, progress, the next target string exactly as the API returns it, and contributors incl. bench.
3. Seed 10 ranked lifts → overall badge unlocks, label matches API.
4. Screenshots next to S34/S35/S37 `screen.png` in `docs/smoke/ami-168/` (390, SE, Android): fonts, radii and colors match; no extra metrics or headers that Stitch lacks.
5. Loading skeleton + error state + pull to refresh. Files ≤300 lines. No hex.

## Path index
`features/anatomy/*`, `features/strength-ui/*`, `features/you/YouScreen.tsx`, `features/rank/KineticRankTeaser.tsx` (card pattern), `lib/api/badges.ts` (query pattern), Stitch S34/S35/S37.
