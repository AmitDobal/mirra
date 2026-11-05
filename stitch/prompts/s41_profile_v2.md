# S41 — You / Profile v2 (all details + preferences)

Output dir: `stitch_mirra_ai_personal_trainer/s41_profile_v2` · Generate: `node scripts/stitch/generate.mjs generate --prompt-file stitch/prompts/s41_profile_v2.md --out stitch_mirra_ai_personal_trainer/s41_profile_v2`
Purpose: replaces S24. Removes the top refresh button row (pull-to-refresh only). Shows every onboarding answer and preference grouped into Body, Training, Nutrition, Coach, with chevron edit rows. Keeps every item S24 has today.

## Frame + system (do not deviate)
- One iPhone screen, 390 pt wide, dark mode only, tall scrolling page (render the full scroll height). Design system: **Kinetic Performance** (attached). Canvas `#131313`.
- Colors only from these tokens: surface `#131313`, surface-container-low `#1c1b1b`, surface-container `#201f1f`, surface-container-high `#2a2a2a`, surface-container-highest `#353534`, outline-variant `#454936`, on-surface `#e5e2e1`, on-surface-variant `#c5c9b0`, lime primary-container `#cbf150` (text on lime `#161e00`), lavender secondary `#d1beef`, error `#ffb4ab`.
- Type: Space Grotesk for headlines, numbers, labels (uppercase section labels 11px 700 tracked +0.08em, on-surface-variant). Plus Jakarta Sans for body. Headline-md 22/28 600, headline-sm 18/24 600, body-md 14/20, body-sm 12/16.
- Shape: cards radius 24 with 1px `#2a2a2a` hairline, pills fully rounded, 20pt side margins, 16pt gutters, 28pt between sections. No drop shadows except the floating tab pill. No gradients.
- iOS status bar at top (9:41). NO header bar, NO title row, NO refresh button: the page starts directly with the profile card 12pt under the status bar.

## Row pattern (use for every settings row)
Row 52pt tall inside a section card, 16pt inner padding, 1px `#454936` 30% divider between rows. Left: label in body-md on-surface. Right: value in body-md on-surface-variant, then a 16pt chevron-right in on-surface-variant. Values never wrap; truncate with an ellipsis.

## Layout (top to bottom)
1. Profile card (surface-container-low, radius 28, 20pt padding):
   - Row: 64pt circle avatar with a 2pt lime ring, initials `AC` in headline-sm on surface-container-highest. Right of it: name `Alex Chen` (headline-md on-surface) followed by a small lime pill `PRO` (9px bold, text `#161e00`); below it `alex.chen@gmail.com` (body-sm on-surface-variant).
   - 16pt below: one row of four dark chips (surface-container-high, pill, 32pt tall, label-md on-surface): `Male`, `29 yrs`, `5'11"`, `181 lb`. The `Male` chip has a small lavender person glyph before the text.
2. Two tiles side by side (each half width, 16pt gutter, surface-container-low, radius 24, 16pt padding, chevron-right top-right corner):
   - Left: lime caps label `KINETIC RANK`; headline-sm `Spark`; body-sm on-surface-variant `Best streak 9 · Spark → Apex`.
   - Right: lime caps label `STRENGTH TIER`; headline-sm `Locked · 3/8`; body-sm on-surface-variant `Every muscle ranked Iron → Legendary`.
3. AI credits card (surface-container-high, radius 24, 16pt padding): caps label `AI CREDITS`; body-sm on-surface `312 of 400 AI credits left · resets Dec 1`; 6pt rounded track (surface-container-highest) with lime fill at 78%; body-sm 11px on-surface-variant `88 used this month`.
4. Section label `BODY`, then a card with rows:
   `Sex` → `Male` · `Age` → `29` · `Height` → `5'11"` · `Weight` → `181 lb` · `Goal weight` → `172 lb` · `Pace` → `Steady` · `Units` → `Imperial`
5. Section label `TRAINING`, then one card containing, in order:
   - Plan block (16pt padding): caps label `ACTIVE PLAN`; label-md lime `Week of Nov 3`; headline-sm `Push Day`; body-sm on-surface-variant `2,250 kcal · 165g protein`; label-md lime text link `Open coach →`.
   - Divider, then rows: `Goal` → `Recomp` · `Physique` → `Athletic` · `Experience` → `1–2 years` · `Training days` → `Mon · Wed · Fri · Sat` · `Session length` → `45 min` · `Equipment` → `Dumbbells · Barbell · Cables`
   - Divider, then location block (16pt padding): caps label `TRAINING LOCATION`; body-sm 11px on-surface-variant `Filters kit for coach and plan rebuilds`; three pills in a row: `Primary kit` (active: lime fill, dark text), `Home`, `Hotel` (surface-container-highest, on-surface text).
   - Divider, then a two-line row: label `About your days`, below it body-sm on-surface-variant `Desk 9–6, evenings free after 7. Love heavy squats.` (one line, ellipsis), chevron on the right.
6. Section label `NUTRITION`, then a card with rows:
   `Diet` → `High protein` · `Cuisines` → `American · Mexican · Indian` · `Meals per day` → `3` · `Foods to avoid` → `Shellfish, peanuts`
7. Section label `COACH`:
   - Row above the cards: caps label `YOUR TRAINER` left, body-sm 11px on-surface-variant `Swipe to choose` right.
   - Horizontal row of compact trainer cards (each 104pt wide, radius 20, surface-container-high, portrait photo of an athletic coach filling the top, name in label-lg below): `Spark` (selected: 2pt lime border, small lime check badge), `Drill Sergeant`, `Sweet Spot`, the fourth card `Side-Eye` cut off by the right screen edge.
   - 16pt below, a card with three toggle rows (title body-md on-surface, detail body-sm on-surface-variant, iOS switch right; on = lime track):
     `Speak coach cues` / `One short spoken tip a day when you open Today` (on), with a full-width lime pill button `Play cue now` under it;
     `In-app alerts` / `Streak and session nudges in your Alerts inbox` (on);
     `Adaptive rebuild` / `Coming soon — redistributes missed sets after check-in` (off, whole row at 60% opacity).
8. Section label `ACCOUNT`, then a card with rows:
   - `Subscription` with sub-line body-sm `Pro · Active` → value `Manage / restore` + chevron.
   - `Google` → right side a 6pt lime dot + lime caps `CONNECTED` (no chevron).
9. Section label `CONNECTED`, card with status rows (no chevrons): `Apple Health / Watch` → caps on-surface-variant `SOON`; `Withings Body Scan` → `SOON`; `USDA & Vision Scanner` → 6pt lime dot + lime caps `READY`.
10. Section label `LEGAL`, card with rows: `Privacy Policy` → `Open in browser` + chevron; `Terms of Use` → `Open in browser` + chevron.
11. Centered text button: log-out icon + label-lg `Sign out` in error `#ffb4ab`, 48pt tall.
12. Section label `DANGER ZONE`, card: trash icon + label-lg `Delete account` in error `#ffb4ab`; below it body-sm on-surface-variant `Permanently erases your account, meals, workouts and photos.`
13. 96pt empty bottom clearance, then the floating white tab pill (64pt tall, ~300pt wide, centered, 24pt above the home indicator), five dark icons: home, dumbbell, fork-knife, chart, person (active, lime 42pt circle behind it). No labels.

## Strict rules
- Render ONLY the elements listed in Layout, in that order, with the EXACT text strings given (keep capitalization). Data values are exact; do not change numbers.
- Do NOT add: a page title, app-name headers ("Mirra Engine", "Athletic OS", version/build tags), a refresh button or spinner, "verified" badges, member-since dates, BMI, body-fat %, calories burned, HRV, extra metrics, charts, graphs, XP, leaderboards, social or share buttons, export buttons, emojis, confetti, glow blobs, gradients, marketing copy, or any section not listed.
- Do NOT invent new colors. No tier colors on this screen.
- If space remains, leave it as empty canvas. Do not fill it.
