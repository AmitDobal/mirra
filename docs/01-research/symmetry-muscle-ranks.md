# Research: Symmetry muscle / exercise ranks → Mirra Strength Grades

Date: 2026-11-04. Context: `learnings-symmetry-video.md` item 12 (per-muscle and per-exercise ranks drive Symmetry retention).
Method: headless Playwright crawl of symmetry.club (EN), App Store + Google Play listings, Symmetry's `RanksPage` JS bundle, Hevy's comparison page, web search for Liftoff / Strength Level.
No Reddit or TikTok thread with formula detail was found. Symmetry says it does not publish the exact recipe.

Screenshots and assets: `docs/01-research/assets/symmetry/`

| File | Shows |
| --- | --- |
| `ranks-ladder.png` | The 9 ranks, 3 divisions each, Symmetric on top |
| `ranks-percentile.png` | Bell curve, rank = percentile slice of cohort |
| `ranks-score.png` | Bodyweight-adjusted score + 4 scoring families |
| `ranks-consistency.png` | Sustained-score smoothing, 85% floor |
| `ranks-page-full.png` | Whole `/en/ranks` page (incl. 4 rank layers) |
| `rank-global-es.png` | In-app global rank card + male body map tinted per muscle |
| `rank-muscle-diagram-es.png` | Upper-body muscle tint close-up |
| `body-diagram-female.png` | Female front/back map, unranked muscles left dark |
| `badge-*.png` | Badge art per tier; division II/III add wings |
| `appstore-montage.png` | App Store shots 2-5 ("Get your rank" body map with legend) |
| `app-store-listing.png`, `play-store-listing.png` | Store pages incl. reviews |

## 1. Findings

### 1.1 Tier ladder (confidence: high, official page)

Source: https://symmetry.club/en/ranks

9 ranks. Ranks 1-8 have divisions I → II → III. The top rank has none.

| # | Rank | Divisions | Illustrative percentile band (JS `bands`) | Bell-curve color |
| --- | --- | --- | --- | --- |
| 1 | Iron | I II III | 0-3 / 3-5 / 5-10 | `#7C838D` grey |
| 2 | Bronze | I II III | 10-15 / 15-20 / 20-25 | `#A37359` copper |
| 3 | Silver | I II III | 25-30 / 30-35 / 35-40 | `#B4BAC4` |
| 4 | Gold | I II III | 40-45 / 45-50 / 50-55 | `#EDB554` |
| 5 | Ruby | I II III | 55-60 / 60-65 / 65-70 | `#DE5F70` |
| 6 | Emerald | I II III | 70-75 / 75-80 / 80-85 | `#6FAB7D` |
| 7 | Diamond | I II III | 85-89 / 89-92 / 92-95 | `#95C7EF` |
| 8 | Champion | I II III | 95-97 / 97-98 / 98-99 | `#7523C3` purple |
| 9 | Symmetric | none | 99-100 ("top 1%") | `#3074F8` blue |

- The page says the chart is illustrative and "does not reproduce the real cutoffs". Bands above come from the page's JS, so treat them as the intended shape, not exact production values.
- The App Store "Get your rank" screenshot shows an older legend: Bronze 80%, Silver 60%, Gold 40%, Ruby 30%, Emerald 20%, Diamond 10%, Champion 5%, Symmetric top 1% (no Iron). The ladder was redesigned ("new icons, new colors, clearer progression", Play Store).
- Visuals: dark UI. Each rank is a gem/metal badge. Division I = bare badge, II = small wings, III = larger wings. Symmetric = gold laurel + crown around a blue orb. Copy always pairs the rank with "You're part of the top N% strongest".

### 1.2 How a score is computed (confidence: medium; principles official, formula secret)

Source: https://symmetry.club/en/ranks (score section + FAQ).

- **Rank = percentile in a cohort.** Cohort = same sex + same exercise. Distribution comes from community data, outliers removed, minimum sample required before an exercise gets ranks.
- **Bodyweight-adjusted score** using "allometric scaling, the same principle powerlifting uses to compare weight classes". No age factor is mentioned. Men and women: same rules, separate cohorts.
- **No max testing.** Normal working sets (weight + reps) feed the score. The FAQ says heavier weight at fewer reps "can score the same or better", so an e1RM-style weight/reps trade-off is used.
- The on-page demo index is `(lifted / bodyweight) × (1 + min(reps,15)/20) × 10`. It is labelled "does not use Symmetry's formula". Ignore it as a formula.
- **4 scoring families:** external load (bench, squat, row: weight × reps); bodyweight load (pull-up, dip, muscle-up: added weight counts up, machine assistance counts down); high-rep bodyweight (push-up, sit-up, leg raise: max reps); time-based (plank, isometric holds: seconds).
- **Sustained, not peak.** Recent sessions weigh more than a single spike (smoothed average). After a promotion there is protection against one bad session. Each exercise score never falls below **85% of its all-time best**. **Time off never lowers rank.**
- Ranks can drop when thresholds are recalibrated manually. Users dislike this (FAQ admits it).
- You can have a rank from session 1 if the profile (sex, bodyweight) is complete and the exercise has enough data.
- User complaint (Play Store, Sep 2026): "Moves you down the ranks in exercises even when you under perform because it's the second exercise of the muscle group". Fatigued sets lower the sustained score.

### 1.3 Rank layers (confidence: high, official page)

1. **Exercise rank** (300+ exercises). Shown after each workout as a "New ranks" list (e.g. Bench press Gold II).
2. **Muscle rank** = combination of the exercise ranks that train that muscle, **weighted by number of sets**. Tap a muscle to see which exercises it comes from.
3. **Muscle group rank**: arms, legs, chest, back, shoulders, core (6 zones).
4. **Global rank** ("Symmetry Rank"): whole physique, "a complete physique weighs more than one strong point". Unlocks at **≥10 ranked exercises**.

### 1.4 Muscle taxonomy and anatomy map (confidence: medium, read from in-app images)

- Front + back figures side by side, male and female variants, white outlines on near-black. Each muscle region is filled with its tier color (gradient texture). Unranked regions stay dark.
- Regions visible in `rank-global-es.png`: traps, front delts, side delts, chest, biceps, forearms, abs, obliques, quads, adductors, calves/tibialis (front); traps, rear delts, triceps, lats/upper back, lower back, glutes, hamstrings, calves (back).
- Exercise library lists primary and secondary muscles per exercise (Hevy comparison: https://www.hevyapp.com/compare/symmetry/). Routine cards show a mini body with targeted muscles in blue (`appstore-montage.png`, shot 2).
- Exact primary/secondary weights per exercise are not public.

### 1.5 Comparable apps (scoring references)

**Strength Level** (https://strengthlevel.com/strength-standards/bench-press/kg, confidence high)
- Standards from ~48.7M user-submitted lifts (10.9M after filtering implausible/duplicate data).
- 5 levels as percentiles: Beginner = stronger than 5%, Novice 20%, Intermediate 50%, Advanced 80%, Elite 95%.
- Tables per sex × bodyweight row. Male bench 1RM (kg): 60 kg BW → 37/53/72/95/119; 80 kg → 56/75/98/124/151; 100 kg → 73/95/120/149/179.
- Thresholds do not scale with one fixed exponent (beginner grows faster than elite with bodyweight), so a lookup table interpolated by bodyweight beats a single allometric power.

**Liftoff** (via https://www.sensai.fit/blog/liftoff-vs-lyfta-vs-hevy-2026, confidence medium, third party)
- Every logged set scored 1-1000 at the lifter's bodyweight and sex. 9 ranks: Wood, Bronze, Silver, Gold, Platinum, Diamond, Champion, Titan, Olympian. Wood 1-199, then 100 points per rank, Olympian ≥900.
- e1RM = Epley `w × (1 + reps/30)`. Over 30 reps = endurance, not strength. Warm-ups and imported sets excluded.
- Separate continuous male/female curves by bodyweight. ~547M sets from 2.65M lifters. Exercise needs 100K entries before it gets a curve. Curves re-fit periodically.

**Lyfta**: strength ranking "against lifters of similar age and bodyweight" (Premium). Shows age is a valid optional cohort axis.

### 1.6 Takeaways

- All three use the same core: **e1RM from working sets → compare with a sex + bodyweight cohort → percentile → named tier**.
- Symmetry's differentiators: muscle/group/global layers, body map tint, sustained score with 85% floor and no break decay, post-workout "ranks moved" moment.
- Weak spots to avoid: silent recalibration drops, fatigue-driven drops, opaque "top N%" with no concrete target.

## 2. Proposal for Mirra: "Strength Grades"

### 2.1 Relation to Kinetic Rank

- **Kinetic Rank** (Spark → Ember → Forge → Volt → Apex, `apps/mobile/src/features/rank/rank-meta.ts`, S33) stays the **consistency** axis: streak days, account-level, unlock rewards.
- **Strength Grade** is the new **strength** axis: per exercise, per muscle, per group, plus one overall grade. Different names and icon family, so the two never collide (no "Apex" in grades).
- They do not multiply each other. Cross-links only: S33 shows overall Strength Grade as a second card; Kinetic tiers can gate depth (e.g. Forge unlocks the full muscle drill-down) if product wants it.
- Mirra's rebuild-on-skip story fits Symmetry's best rule: **skipped days never lower a grade.**

### 2.2 Ladder (original names)

7 grades. Grades 1-6 have divisions I / II / III. The top grade has none. Band anchors match Strength Level's public levels (p5/p20/p50/p80/p95), so we can seed thresholds from bodyweight standards before we have our own data.

| # | Grade | Percentile band | Divisions (pct) | Strength Level anchor |
| --- | --- | --- | --- | --- |
| 1 | Base | 0-20 | 0-7 / 7-14 / 14-20 | below Novice |
| 2 | Grit | 20-35 | 5 pts each | Novice |
| 3 | Drive | 35-50 | 5 pts each | Novice → Intermediate |
| 4 | Power | 50-65 | 5 pts each | Intermediate |
| 5 | Surge | 65-80 | 5 pts each | Intermediate → Advanced |
| 6 | Prime | 80-95 | 5 pts each | Advanced |
| 7 | Mythic | 95-100 | none | Elite |

- 19 steps total. Fewer, wider steps than Symmetry's 25, so early users see a promotion within the first 2-3 weeks.
- Colors: a cool-to-hot ramp built from Kinetic Performance tokens (`outline` → `secondary` lavender → `primary-container` lime → `tertiary` crimson for Mythic). New tier tokens must land in Stitch / `DESIGN.md` first. No hex in code.
- Copy: "Power II · stronger than 58% of lifters your size" plus a concrete target (2.5).

### 2.3 Muscle taxonomy (18 muscles, 6 groups)

| Group | Front view | Back view |
| --- | --- | --- |
| Chest | `chest` | |
| Shoulders | `front_delts`, `side_delts` | `rear_delts` |
| Arms | `biceps`, `forearms` | `triceps` |
| Back | | `traps`, `lats`, `upper_back` (rhomboids/mid-traps), `lower_back` |
| Core | `abs`, `obliques` | |
| Legs | `quads`, `adductors`, `calves` (front shin view) | `glutes`, `hamstrings`, `calves` |

- `calves` drawn on both views, scored once. 18 ids, 17 unique scores.
- Maps down to the existing coarse region ids in `03-engineering/retention-streaks-badges-anatomy.md` (`chest`, `back`, `shoulders`, `arms`, `core`, `glutes`, `quads`, `hams`, `calves`).
- `exercise-catalog.json` already has `muscles: [[label, pct]]` (e.g. bench 70/30). Add `muscleIds: [{ id, pct }]` with the 18 ids, plus `scoring: "load" | "bodyweight" | "reps" | "time"` and `bwFactor` for bodyweight lifts.

### 2.4 Scoring formula

Inputs already in D1: `set_logs.weight_kg`, `set_logs.reps`, user bodyweight (`users.weight_kg` / latest `weight_logs`), sex (onboarding physique). Pure functions in a shared package; standards are versioned data (`standards_version`).

**Step 1. Set → e1RM** (working sets only; skip sets flagged warm-up and sets with reps > 12)

```
load   = weight_kg                                   // scoring = load
load   = bw × bwFactor + added_kg − assist_kg        // scoring = bodyweight
                                                     //   pull-up 1.0, chin-up 1.0, dip 0.95, inverted row 0.6, push-up 0.65
e1RM   = load × (1 + reps / 30)                      // Epley; same as Liftoff
```

**Step 2. e1RM → percentile.** Standards table per `exercise × sex`: anchor values T5, T20, T50, T80, T95 at bodyweight rows every 10 kg.

- Interpolate each anchor linearly by the user's bodyweight. A table beats one allometric exponent (see 1.5).
- Fallback when only one bodyweight row exists: `T(bw) = T(ref) × (bw / ref)^0.67` (allometric, ref = 80 kg M / 60 kg F).
- `pct` = piecewise-linear between anchors. Below T5: `5 × e1RM / T5`. Above T95: `95 + 5 × (e1RM − T95) / (0.25 × T95)`, cap 99.9.
- `scoring = reps` (push-up, sit-up): same anchors over max reps in one set. `scoring = time` (plank): anchors over seconds.

**Step 3. Session → exercise score (sustained, forgiving)**

```
session_pct  = max pct over the session's working sets for that exercise   // best set only: fatigue can't hurt
sustained    = 0.3 × session_pct + 0.7 × sustained_prev                    // EWMA per session, not per day
exercise_pct = max(sustained, 0.85 × best_pct_ever)                        // Symmetry-style floor
```

- First session seeds `sustained = session_pct`. No time decay.
- Demotion hysteresis: drop a division only after 2 sessions below the boundary minus 2 pct pts.
- Standards recalibration never demotes visibly: keep the displayed grade until the user's next session, and say "standards updated" in the release note.

**Step 4. Exercise → muscle**

```
w(ex, m)   = involvement_pct(ex, m) × sets_last_90d(ex)      // only involvement ≥ 25%
muscle_pct = Σ w × exercise_pct / Σ w
```

Muscle stays unranked (dark on map) until it has a contributing exercise.

**Step 5. Muscle → group → overall**

- `group_pct` = mean of ranked muscles in the group.
- `overall_pct = 0.75 × mean(group_pct) + 0.25 × min(group_pct)`. Balance beats one strong lift, in our own way.
- Overall unlocks at ≥ 8 ranked exercises covering ≥ 5 of 6 groups.

**Seeding the standards (decision needed)**

- Do not copy Strength Level tables: proprietary data.
- v1: squat / bench / deadlift / OHP anchors from OpenPowerlifting open data, shifted down to a general-gym population. Other exercises as ratios of a parent lift (e.g. incline DB press per hand ≈ 0.35 × bench, lat pulldown ≈ 0.75 × pull-up load). Owner: content + one review by a coach.
- v2: re-fit from Mirra's own `set_logs` once an exercise × sex cohort has ≥ 2,000 lifters. Outlier filter: e1RM > 3.5 × BW (load lifts) or reps > 60.
- Optional later: age cohort (Lyfta) via masters age coefficients. Not v1.

### 2.5 "How to reach the next division" (Mirra twist)

Symmetry shows "top N%". Mirra is a coach, so show a concrete set:

```
target_e1RM = anchor value at next division boundary (user's bw)
target_kg   = target_e1RM / (1 + r / 30)   for r = the plan's prescribed reps
display     = round to 2.5 kg / 5 lb  →  "185 lb × 8 gets you to Power III"
```

The AI plan generator can use the same number as a progressive-overload target.

### 2.6 UI surfaces (Stitch first for anything new)

| Surface | Change | Stitch status |
| --- | --- | --- |
| S31/S32 body map | Add "Grades" mode: tint each of the 18 regions by grade; tap → sheet with muscle grade + contributing exercises | Exists for primary/secondary; needs grade variant |
| New: Strength map screen | Full front/back figure, overall grade card, group list (6 rows) | New screen |
| S26 exercise detail | Grade badge, progress bar to next division, "next target" set (2.5) | Variant |
| S17 workout complete | "Grades moved" list after each session (key retention moment) | Variant |
| S16 live HUD | Optional next-target hint on the working set | Variant |
| S33 Kinetic Rank / S24 profile | Second card: overall Strength Grade | Variant |
| S22 progress | Grade history per exercise / muscle | Later |
| Badge art | 7 grade icons, divisions shown as 1-3 pips | New asset set |

API / data (builder tickets, not done here):

- D1: `exercise_scores (user_id, exercise_id, sustained_pct, best_pct, sessions, updated_at)`, `muscle_scores (user_id, muscle_id, pct, updated_at)`. Recompute on workout complete.
- `GET /v1/strength/grades` → overall, groups, muscles, exercises (Zod in `packages/contracts`).
- Needs stable exercise ids on `workout_exercises` (today it stores names; see `d1-schema.md`).
- Analytics: `grade_up` (exercise / muscle / overall), `grade_sheet_viewed`, `next_target_hit`.

### 2.7 Open questions

1. Is sex required for grades? Non-binary / skipped: default to the male cohort with a note, or ask once on first grade view.
2. lb vs kg display for US: lb by default.
3. Free vs Pro: Symmetry keeps ranks free (retention hook). Recommend grades free, deeper history in Pro.

## Sources

- Symmetry rank guide: https://symmetry.club/en/ranks (page text, FAQ, `RanksPage` JS bundle bands and colors)
- Symmetry App Store: https://apps.apple.com/us/app/symmetry-ai-gym-workout-log/id6474446718
- Symmetry Google Play: https://play.google.com/store/apps/details?id=club.symmetry.application
- Hevy vs Symmetry: https://www.hevyapp.com/compare/symmetry/
- Strength Level bench standards: https://strengthlevel.com/strength-standards/bench-press/kg
- Liftoff rank system (third party): https://www.sensai.fit/blog/liftoff-vs-lyfta-vs-hevy-2026
