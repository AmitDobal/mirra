# Mirra — Google Stitch FULL PASTE (detailed, all screens)

**Copy everything below the line into Stitch.**  
Also attach reference image: `stitch/REF-dark-lime-fitness-ui.jpg` (dark fitness UI — lime + soft purple + floating white pill nav).  
Generate **24 separate iPhone 15 Pro artboards** named **S01–S24**. Match **that visual language** on every screen while keeping Mirra product content below. **Dark mode.**

---

You are designing **Mirra**, a US iOS AI personal trainer app: mirror selfie → personalized week (workouts + nutrition), daily check-in, rebuild plan when user skips. Subscription product.

## VISUAL REFERENCE (MANDATORY — match this look)

Match the attached dark fitness collage aesthetic:

- **Deep charcoal / near-black canvas** (not light paper, not olive notebook)
- **Electric lime** primary accent (challenge banners, selected day circles, primary CTAs, progress highlights)
- **Soft pastel purple / lavender** secondary surfaces (stat cards, workout photo cards, secondary chips)
- **Large corner radii** everywhere (~20–28pt cards, pill chips, soft circles)
- **Photo-forward** workout / challenge cards with athletes cropped into rounded rectangles
- **Floating white pill tab bar** at bottom (icon-only or icon + tiny label), active icon in a colored circle (lime or lavender)
- Soft glass / frosted overlays on live workout HUD
- Clean modern geometric sans for titles; bold numeric type for stats/timers
- High contrast: lime/lavender pops on black — premium gym app, not wellness cream

**Do NOT** revert to warm paper + olive. **Do NOT** copy generic AI purple gradients / neon glow blobs. Soft lavender cards are OK; neon cyberpunk is not.

---

## GLOBAL DESIGN SYSTEM (apply to every screen)

### Colors
- Canvas / page background: `#121212` (deep charcoal)
- Elevated surface / cards: `#1A1A1A` or soft lavender `#C3B1E1` / muted purple `#A894C8` for hero/stat cards
- Primary text on dark: `#FFFFFF`
- Secondary / muted on dark: `#A3A3A3`
- Hairlines / borders: `#2A2A2A`
- **Primary accent (CTAs, selected day, key highlights):** Lime `#D8FF5C` — label on lime = near-black `#121212`
- **Secondary accent (stat tiles, workout photo cards, alt active):** Soft purple `#C3B1E1` — label on purple = near-black or white depending on contrast
- Destructive only: `#FF6B8A` or soft red on dark
- Floating tab bar: solid / near-white `#FFFFFF` pill; inactive icons charcoal; active = lime or purple filled circle behind icon

### Typography
- UI / titles: modern geometric sans (Satoshi / similar), titles 18–22px semibold/bold, slightly wide tracking OK
- Body: clean sans 12–13px
- Numbers / timers / kcal / %: bold condensed or mono-adjacent, large where hero (rings, timers)
- Never use Inter/Roboto defaults if avoidable; no emoji; no giant marketing serif paragraphs

### Components
- Primary button: full-width or large pill, min height 48pt, corner radius **24–999** (pill), **lime fill** `#D8FF5C`, dark label
- Secondary: soft dark surface or outline, white/muted label; or lavender fill for alternate CTAs
- Text button: 12px muted or lime
- Cards: radius **22–28**, generous padding; photo cards clip images with `overflow:hidden`
- Chips / filters: pill shape; selected = white or lime fill on dark; unselected = translucent dark border
- Progress rings: thick stroke lime + purple segments OK (like reference calorie donut)
- Onboarding progress: top `n / 8` thin lime track under status bar
- Back: light chevron top-left on dark
- **Tab bar (only S15, S18, S20, S22, S24):** floating **white capsule** above home indicator, 5 icons: **Today · Fuel · Coach · Progress · You** (home / leaf-or-flame / chat-or-bolt / chart / user). Active = colored circle behind icon (lime on Today/Fuel, soft purple on Coach/Workout moments). **No center FAB.** Not a flat iOS system tab strip.

### Layout philosophy
- Match reference **density of visuals** (big photo cards, lime hero banner, 2-up purple stat tiles, week strip) — but **only listed Mirra content**, no random Running/Cycling marketing filters unless specified
- One clear hero per home-like screen; avoid stacking every widget type at once
- **Still ban:** leaderboards, mood-pill rows, tip-card pairs, fake star ratings, confetti, medical BF% gauges, cyber neon glow, light-mode paper
- Safe areas; iPhone 15 Pro; status bar light content

### Product nav map
- Onboarding: S01→S02→…→S12→S13→S14→S15
- Tabs from S15: Fuel=S18, Coach=S20, Progress=S22, You=S24
- Workout: S15→S16→S17→S15
- Skip path: S20→S21→S15

---

# S01 — Splash

**Job:** Brand beat only.

**Chrome:** No nav, no tab bar, no buttons. Full dark canvas.

**Layout top→bottom:**
1. Empty charcoal canvas `#121212`
2. Vertically centered wordmark `Mirra` (semibold ~24px, white, slight letter-spacing)
3. Optional thin lime underline ~32pt wide under wordmark

**Exact copy:** `Mirra`  
**Buttons:** none  
**Must not:** illustration dump, tagline paragraph, spinner

---

# S02 — Welcome / Hook

**Job:** Mirror→Week + rebuild promise in this dark visual language.

**Chrome:** No back, no tab bar. Sticky lime CTA bottom.

**Layout top→bottom:**
1. Top padding ~64pt
2. Small lime pill eyebrow: `AI COACH`
3. Title white 22–26px, two lines: `Mirror in.` / `Week out.`
4. Subtitle muted max 2 lines: `Snap once. Get workouts + fuel. Miss a day — we rebuild before you quit.`
5. Soft lavender rounded card (radius 24) with 3 compact mono rows: `01  Plan` · `02  Check-in` · `03  Rebuild` (dark text on lavender OR white text on dark elevated card with lime numerals)
6. Flexible empty space
7. Sticky lime pill primary `Continue`
8. Under it muted text `I already have an account`

**Buttons:**
1. Primary lime: `Continue`
2. Text: `I already have an account`

**Must not:** light paper background; cluttered feature icon grid

---

# S03 — Goal

**Chrome:** Back (white) + progress `1 / 8` lime fill ~12.5%. No tab bar.

**Layout:**
1. Title white 18–20px: `What’s the main goal?`
2. Hint muted 11px: `Pick one. You can change later.`
3. Vertical list of 5 large rounded rows (radius 16–20) on elevated dark:
   - `Lose fat`
   - `Build muscle`
   - `Recomp`
   - `Get consistent`
   - `Performance`
4. Show **Build muscle** selected: lime left accent OR lime border + soft lime wash
5. Sticky lime primary `Continue`

**Buttons:** `Continue`  
**Must not:** long descriptions under each option, stock lifestyle collage

---

# S04 — Experience

**Chrome:** Back + `2 / 8`

**Layout:**
1. Title: `Training experience?`
2. Four large rounded select rows: `New` · `Some months` · `1–2 years` · `3+ years` (one selected lime)
3. Sticky lime `Continue`

**Buttons:** `Continue`

---

# S05 — Body stats

**Chrome:** Back + `3 / 8`

**Layout:**
1. Title: `Quick stats`
2. Field stack on dark elevated cards (radius 16):
   - Label muted `Biological sex` — segmented pill: `Female` | `Male` | `Prefer not` (selected = lime)
   - Label `Age` — number field example `24`
   - Label `Height` — value + unit toggle `cm` | `ft`
   - Label `Weight` — value + unit toggle `kg` | `lb`
3. Sticky lime `Continue`

**Buttons:** `Continue`  
**Must not:** BMI gauge, ideal-body illustration, health score ring spam

---

# S06 — Target

**Chrome:** Back + `4 / 8`

**Layout:**
1. Title: `Target`
2. Label `Goal weight` + number field on dark surface
3. Label `Pace` + two pills: `Steady` (selected lime) · `Aggressive`
4. Sticky lime `Continue`
5. Text under: `Skip target weight`

**Buttons:** `Continue` · text `Skip target weight`

---

# S07 — Equipment

**Chrome:** Back + `5 / 8`

**Layout:**
1. Title: `Where will you train?`
2. Wrapping multi-select **pills** (several selected = lime fill dark text):  
   `Full gym` · `Dumbbells` · `Barbell` · `Machines` · `Cables` · `Bands` · `Bodyweight only` · `Home minimal`
3. Sticky lime `Continue`

**Buttons:** `Continue`  
**Must not:** 3D equipment icon clutter grid

---

# S08 — Schedule

**Chrome:** Back + `6 / 8`

**Layout:**
1. Title: `Days you can train`
2. Horizontal row of **7 circular day toggles** `M T W T F S S` — Mon/Wed/Fri selected as **lime filled circles** (like reference calendar highlight)
3. Label `Session length`
4. Four pills: `20` · `30` · `45` · `60` + tiny `min` — `45` selected lime
5. Sticky lime `Continue`

**Buttons:** `Continue`  
**Must not:** full month calendar grid

---

# S09 — Diet prefs

**Chrome:** Back + `7 / 8`

**Layout:**
1. Title: `How you eat`
2. Multi-select pills: `No preference` · `High protein` · `Vegetarian` · `Vegan` · `Halal` · `Dairy-free` · `Gluten-free`
3. Label `Foods to avoid` + single-line field, placeholder `Optional` (dark input)
4. Sticky lime `Continue`

**Buttons:** `Continue`

---

# S10 — Mirror capture

**Chrome:** Back + `8 / 8`

**Layout:**
1. Title: `Mirror selfie`
2. Subtitle muted 11px: `Optional. Used for shape progress — not a medical body-fat reading.`
3. Large portrait camera preview, radius **24**, dark well, thin silhouette guide
4. Lime primary pill `Capture`
5. Outline / ghost secondary `Skip for now`

**Buttons:** `Capture` · `Skip for now`  
**Must not:** BF% overlay, DNA scan graphics

---

# S11 — Generating week

**Chrome:** none (blocking). Dark canvas.

**Layout:**
1. Centered soft skeleton bars (dark elevated + subtle lime shimmer) suggesting week strip
2. Below: muted 11px `Building your week…`
3. Optional thin lime progress pulse under skeletons

**Buttons:** none  
**Must not:** rocket, “AI thinking…” checklist essay

---

# S12 — Week reveal

**Chrome:** No tab bar. Sticky lime CTA.

**Layout (visual like reference “plan” screen — photo-forward, not plain list):**
1. Title white: `Your week is ready`
2. Mute line: e.g. `Build muscle · 4 days / week`
3. **Lime hero card** (radius 24): summary e.g. `Upper + lower split` · small progress ring ~72% style · calorie chip `~1,840 kcal/day` (dark text on lime)
4. Horizontal **7-day strip** on dark: day letters + tiny tags (`Lift` / `Rest` / `Fuel`); today = lime circle
5. Soft purple/lavender **workout photo cards** (exactly 3), stacked, radius 24, athlete photo + overlay text:
   - `Push day` · `45 min` · pills `Full gym` · `6 exercises`
   - `Pull day` · `40 min`
   - `Legs` · `45 min`
6. Optional mute outcome: `At this pace, ~12 lb by Mar 12`
7. Sticky lime `Start with Mirra`
8. Text `Edit answers`

**Buttons:** `Start with Mirra` · `Edit answers`  
**Must not:** confetti, testimonials, light mode

---

# S13 — Paywall

**Chrome:** Top-right close `X` (white). No tab bar.

**Layout:**
1. Title 22px white: `Don’t quit on day three`
2. Up to **3** short benefit lines on dark/lavender chips:
   - `Daily check-ins`
   - `Rebuild when you skip`
   - `Full week plans`
3. Plan selector (2 large rounded cards):
   - **Annual** selected: lime border, label `Annual`, `$79.99/yr`, badge `Best`, mute `$6.67/mo`
   - **Monthly**: `$12.99/mo` on elevated dark
4. Sticky lime `Start 7-day trial`
5. Text `Restore purchases`
6. Footer 9px muted legal one line

**Buttons:** `X` · `Start 7-day trial` · `Restore purchases`  
**Must not:** star-rating collage, countdown panic

---

# S14 — Auth

**Chrome:** No tab bar. Dark canvas.

**Layout:**
1. Title: `Save your plan`
2. Stacked large rounded buttons:
   - `Continue with Apple` (white / system dark-compatible)
   - `Continue with Google` (elevated outline)
   - `Email` (outline)
3. Text `Not now`
4. Footer muted: `Privacy` · `Terms`

**Buttons:** Apple · Google · Email · `Not now`  
**Must not:** mascot, social proof carousel

---

# S15 — Today (HOME)

**Chrome:** **Floating white pill tab bar — Today active (lime circle)**

**Layout (match reference Activity / Home energy):**
1. Top: title `Today` left · small grid/menu or bell right (minimal)
2. Week strip: month mute + 7 day circles; **today lime filled**
3. **Lime challenge / focus banner** (radius 24, photo optional):  
   `Today’s focus` · `Upper strength · before you scroll` · or `Do your plan before 9:00 AM` style short line — keep Mirra meaning
4. Filter pills optional thin row: `All` (selected white) · `Lift` · `Fuel` — max 3, not a clutter wall
5. **2-up soft purple stat tiles** (square, radius 22):
   - e.g. `620` / `kcal left`
   - ring `Check-in` / `Due` or goals %
6. Primary workout card (lavender or dark+photo): title `Upper strength` · `45 min · Full gym` · lime CTA `Start workout` · text `Swap day`
7. Mini week tags under or above as needed — do not duplicate endless sections
8. Floating white pill tabs: Today | Fuel | Coach | Progress | You

**Buttons:** `Start workout` · `Swap day` · tab items · optional `Check-in` chip  
**Must not:** 4 unrelated charts + leaderboard; light paper UI

---

# S16 — Workout session

**Chrome:** No system tab bar. **Live session HUD like reference right screen.**

**Layout:**
1. Full-bleed exercise photo / still of trainer (squat-like demo OK as placeholder)
2. Top-right: frosted `Pause` pill + small `kcal` readout if space
3. Bottom **frosted white / light glass sheet** (radius 28, grab handle):
   - Exercise title e.g. `Barbell row`
   - Mono progress `1 / 6`
   - Row: `Elapsed` · large center timer e.g. `01:30` · `Set 2/5`
   - Sets mini table or compact set chips
   - Lime primary `Log set`
   - Text: `Swap exercise` · `Skip exercise`
   - Outline `Finish workout`

**Buttons:** `Pause` · `Log set` · `Swap` · `Skip` · `Finish workout`  
**Must not:** autoplay video chrome spam, essay tips

---

# S17 — Workout complete

**Chrome:** No tab bar. Dark canvas.

**Layout:**
1. Lime check / thin success mark
2. Title white: `Session logged`
3. Soft purple summary card: mono `42 min · 8,400 kg · 6 exercises`
4. Label `How hard was it?` + RPE pills `1`–`10` (selected lime e.g. 7)
5. Sticky lime `Done`

**Buttons:** RPE chips · `Done`  
**Must not:** confetti explosion, badge spam

---

# S18 — Fuel (nutrition home)

**Chrome:** **Floating white pill tab — Fuel active**

**Layout (calorie card energy like reference bottom donut):**
1. Header `Fuel`
2. Large dark/lavender card with **donut** (lime + purple + grey segments):
   - `1,840` target · burned/logged · **`620 left`** hero
3. Thin meters or chips `P 90/140` · `C` · `F`
4. Lime primary `Log meal` · ghost `Snap meal`
5. 2–3 meal rows on dark elevated OR empty `Nothing logged.`
6. Floating tab bar

**Buttons:** `Log meal` · `Snap meal` · tabs  
**Must not:** recipe ad banners, pet gamification

---

# S19 — Log meal

**Chrome:** No tab bar. Top: `Cancel` | `Log meal` | lime text `Save`

**Layout:**
1. Optional photo thumb radius 16
2. Fields on dark surfaces: `Name` · `Calories` · `Protein` `Carbs` `Fat`
3. Meal pills: `Breakfast` · `Lunch` · `Dinner` · `Snack` (one lime selected)

**Buttons:** `Cancel` · `Save` · meal chips  
**Must not:** endless recipe panel

---

# S20 — Check-in (Coach)

**Chrome:** **Floating white pill tab — Coach active (soft purple circle OK)**

**Layout:**
1. Small empty band top (future coach visual — leave blank, no cartoon mascot)
2. Title: `Daily check-in`
3. One AI prompt on lavender soft card: e.g. `You skipped yesterday. What should we do?`
4. Wrap pills: `Done as planned` · `Partial` · `Skipped` · `Soreness` · `Low sleep` · `Travel` (selected = lime)
5. Note field placeholder `Add a note`
6. Lime `Submit check-in`
7. History 3 mono rows: `Thu · Done` · `Wed · Skipped` · `Tue · Partial`
8. Floating tab bar

**Buttons:** chips · `Submit check-in` · tabs  
**Must not:** full chatbot transcript wall

---

# S21 — Rebuild preview

**Chrome:** No tab bar.

**Layout:**
1. Title: `Week rebuilt`
2. Subtitle: `You skipped Tue lift. Here’s the fix.`
3. `Before` muted 7-day strip
4. `After` strip with **lime** highlights on changed days
5. Diff lines on dark card: `Tue Lift → Thu` · `Kcal 1840 → 1760` · `Rest added Wed`
6. Lime `Apply rebuild`
7. Ghost `Keep old plan`

**Buttons:** `Apply rebuild` · `Keep old plan`  
**Must not:** celebration illustration dump

---

# S22 — Progress

**Chrome:** **Floating white pill tab — Progress active**

**Layout:**
1. Segment pills: `Photos` | `Weight` — Photos selected (lime/white)
2. Top-right `Add photo`
3. 2-column grid radius 20: 2 photo placeholders + 2 dashed empty
4. Disclaimer 9px muted: `Photos track shape over time. Not a clinical body-fat estimate.`
5. (Weight alternate only if separate artboard state: one sparkline + `Log weight`)
6. Floating tab bar

**Buttons:** segment · `Add photo` · tabs  
**Must not:** leaderboard + 4-box vanity metrics collage

---

# S23 — Add progress photo

**Chrome:** No tab bar. `Cancel` top.

**Layout:**
1. Large camera well radius 24
2. Segment: `Front` | `Side`
3. Mute: `Not a medical body-fat reading.`
4. Lime `Capture` · outline `Choose`
5. Lime `Save` when image present

**Buttons:** `Cancel` · `Front`/`Side` · `Capture` · `Choose` · `Save`

---

# S24 — You / Settings

**Chrome:** **Floating white pill tab — You active**

**Layout:**
1. Header row: avatar circle + name `Alex` + mute email · soft purple/lime badge `Trial` or `Pro`
2. Grouped dark elevated list (radius 20 container), rows:
   - `Edit goals`
   - `Reminders`
   - `Manage subscription`
   - `Restore purchases`
   - `Privacy`
   - `Terms`
   - `Sign out`
   - `Delete account` (destructive)
3. Footer mono `Mirra 0.1.0`
4. Floating tab bar

**Buttons:** rows · tabs  
**Must not:** rainbow profile banner, promo tiles

---

## OUTPUT REQUIREMENTS

1. **24 artboards** S01–S24 with specs above.
2. **Visual language = attached reference**: dark charcoal, lime `#D8FF5C`, soft purple `#C3B1E1`, large radii, photo cards, floating white pill tab bar.
3. Mirra IA / copy / screen jobs stay as specified — restyle into that UI, do not invent a second product.
4. No light olive-paper theme. No medical BF% theater. No leaderboards.
5. Tab bar only on S15, S18, S20, S22, S24 — always the floating white capsule.
6. English copy exactly as given where specified.
