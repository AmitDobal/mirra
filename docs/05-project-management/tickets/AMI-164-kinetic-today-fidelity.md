# AMI-164 — Kinetic Rank S33 fidelity, sx split, Today header / streak / rank chips

**Wave 1** · parallel with AMI-161, AMI-162, AMI-163 · **Depends:** S40 export approved · Arch §9

## Why
Audit of `aa1842b`:
- S33 renders with fallback fonts, because sx has no `font-headline-lg/-sm`, `font-body-md/-sm`, `font-label-caps`.
- The top inset is doubled.
- The CTA is half width, because sx ignores `left-0 right-0`.
- Tier rows lack the S33 pills and connector.
- On Today, the rank chip is hidden for new users, "Rest counts." truncates to "Res…", and the cold streak chip reads as broken.

## Scope
1. Split `theme/sx.ts` (637 lines) into `theme/sx/{index,colors,spacing,type,layout,parse}.ts`. Public import `@/theme/sx` is unchanged (`index.ts` re-exports). No behavior change except the additions below.
2. `font-<scale>` for every DESIGN typography key (display-lg, display-metric, headline-lg/md/sm, body-lg/md/sm, label-lg/md/caps) sets family + weight. Add `left-0`, `right-0`, `top-N`, `bottom-N`.
3. `ui/ScreenScroll.tsx`: prop `insetTop?: boolean` (default true). `KineticRankScreen` passes false.
4. S33 rows: state pills ("Unlocked · Day N", "Active Tier", "In Progress (b/Nd)", "Locked"; the top row reads "Apex · Locked" until unlocked), left connector line with tier-state color, active-tier crimson border card with "N days to complete <tier> milestone · b / Nd". Footer "Next milestone: Forge · 30 days" + full-width "Keep streak active today" CTA. Copy in `src/content/rank.ts`: honest milestone lines only (no DEXA, no XP, no features we do not have).
5. `KineticRankTeaser` fonts fixed (same sx gap).
6. Today header per S40:
   - Remove the "Rest counts." text.
   - Rank chip always visible once badges load. Locked state: lock glyph + "Spark 3/7" in `on-surface-variant`. Unlocked: the title, as today.
   - Below 360pt width the rank chip shows its glyph only.
   - Streak chip zero state: outlined grey flame + "0".
   - Header never truncates at 390pt or at iPhone SE width.

## File ownership
`apps/mobile/src/theme/sx.ts` → `theme/sx/**` · `apps/mobile/src/ui/ScreenScroll.tsx` · `apps/mobile/src/features/rank/**` · `apps/mobile/src/features/today/{TodayHeader,StreakFireChip,TodayScreen}.tsx` · `apps/mobile/src/content/rank.ts` (new). Read-only: `theme/tokens.ts` (AMI-162 owns it this wave).

## Acceptance criteria
1. `/kinetic-rank` matches `s33_kinetic_rank/screen.png`: title in Space Grotesk 28/700, single top inset, CTA spans the full width minus 16pt margins, 5 rows with the right pill per state, connector visible. Side-by-side screenshots in `docs/smoke/ami-164/` for a new user (0 days), a 12-day user (Ember active) and a 100+ day user.
2. Today, new user (best 0): chips read `[lock Spark 0/7] [flame 0]`; no "Res…" anywhere. 9-day user: `[Spark] [flame 9]`. Shots at 390 and SE, plus Android.
3. Every existing screen using sx renders unchanged: before/after screenshots of Today, Fuel, Coach, You, Exercise hub (pixel diff, or eyeball any change and list it).
4. Every sx file ≤300 lines. `rg "font-headline-lg|left-0" apps/mobile/src` usages now resolve: add a dev assert or unit test `theme/sx/sx.test.ts` covering the new classes.

## Path index
`theme/sx.ts`, `ui/ScreenScroll.tsx`, `features/rank/*`, `features/today/TodayHeader.tsx`, `StreakFireChip.tsx`, `TodayScreen.tsx`, `lib/api/badges.ts`; Stitch `s33_kinetic_rank`, `s40_today_header_chips` (after export), `s15c_today_focus_first`.
