# Strength Tiers, real anatomy, plan-chat diff v2

**Status:** architecture for AMI-161..169 (2026-11-04), locked unless PM reopens. **Inputs:** `docs/01-research/symmetry-muscle-ranks.md`, Phase 1 audit of `aa1842b`, Stitch S28/S31/S33. **Rules:** ports + adapters (`integrations.md`), Zod in `packages/contracts`, files ≤300 lines (prefer 250), tokens only, `sx()`/StyleSheet.

## 0. Two axes, never mixed

- **Kinetic Rank** (Spark → Apex) is the consistency axis: best check-in streak (`services/badges.ts`). Circle icons with flame/bolt glyphs.
- **Strength Tier** (Iron → Legendary) is the strength axis: logged working sets. Hexagon badges.
- No shared names and no multiplier between the two.

## 1. Tier ladder

Divisions run **III → II → I** (III = entry, I = top of tier). Legendary has no division. 22 steps, `step` 0..21.

| Tier | Pct band | Division bands (III / II / I) | Token (theme `tier.*`) | Color (S37 approved, `DESIGN.md` `tier-*`) |
| --- | --- | --- | --- | --- |
| Iron | 0-10 | 0-3 / 3-6 / 6-10 | `tier.iron` | `#8f937c` (= outline) |
| Bronze | 10-25 | 10-15 / 15-20 / 20-25 | `tier.bronze` | `#b9825f` |
| Silver | 25-40 | 5 pts each | `tier.silver` | `#c5c9d4` |
| Gold | 40-55 | 5 pts each | `tier.gold` | `#e8c15a` |
| Platinum | 55-70 | 5 pts each | `tier.platinum` | `#8fd6cf` |
| Diamond | 70-85 | 5 pts each | `tier.diamond` | `#9cc8ff` |
| Elite | 85-97 | 85-89 / 89-93 / 93-97 | `tier.elite` | `#d1beef` (= secondary) |
| Legendary | 97-100 | none | `tier.legendary` | `#cbf150` (= primary-container) |

New colors land in Stitch S37 first; PM copies approved values into `kinetic_performance/DESIGN.md`, AMI-162 mirrors them in `apps/mobile/src/theme/tokens.ts`. No hex in components.

## 2. Muscle taxonomy (18 ids, 6 groups)

Contract: `packages/contracts/src/muscles.ts` (AMI-161) exports `MuscleIdSchema`, `MuscleGroupIdSchema`, `MUSCLE_GROUP_OF`.

| Group | Muscle ids |
| --- | --- |
| chest | `chest` |
| shoulders | `front_delts`, `side_delts`, `rear_delts` |
| arms | `biceps`, `triceps`, `forearms` |
| back | `traps`, `lats`, `upper_back`, `lower_back` |
| core | `abs`, `obliques` |
| legs | `quads`, `adductors`, `hamstrings`, `glutes`, `calves` |

### 2.1 Anatomy art (source + license)

**Source:** path data from `react-native-body-highlighter` (github.com/HichamELBSI/react-native-body-highlighter, **MIT**). It ships male + female, front + back SVG paths. We vendor the **path data only** into our own renderer (react-native-svg 15.16 is already a dependency). We do not add the npm package. MIT notice goes in `apps/mobile/src/features/anatomy/paths/LICENSE.md`. One slug per line keeps each path file under 300 lines.

Vendor slug → our display region (many muscles may share one drawn region):

| View | Vendor slug | Muscle ids drawn |
| --- | --- | --- |
| front | chest / biceps / forearm / abs / obliques | chest / biceps / forearms / abs / obliques |
| front | deltoids | front_delts + side_delts |
| front | trapezius / triceps | traps / triceps |
| front | quadriceps / adductors / abductors | quads / adductors / glutes |
| front | calves, tibialis | calves |
| back | trapezius / deltoids / triceps / forearm | traps / rear_delts / triceps / forearms |
| back | upper-back | lats + upper_back |
| back | lower-back / gluteal / hamstring / adductors / calves | lower_back / glutes / hamstrings / adductors / calves |
| both | head, hair, neck, hands, feet, knees, ankles | none (outline only) |

Region fill when several muscles share it: focus mode takes the strongest role; tier mode takes the highest step.

### 2.2 Component (`apps/mobile/src/features/anatomy/`, AMI-162)

```ts
type AnatomyMode =
  | { kind: "focus"; muscles: readonly { id: MuscleId; role: "primary" | "secondary" }[] }
  | { kind: "tier"; steps: Partial<Record<MuscleId, number>> }; // step 0..21, missing = unranked
<AnatomyFigure sex="male" | "female" side="front" | "back" mode={…} height={…} onPressMuscle?={(ids) => …} />
<AnatomyPair …/>   // front + back side by side, optional segmented toggle (S34/S36)
```

| Mode | Fill | Passive |
| --- | --- | --- |
| focus | primary = `primary-container` lime, secondary = `secondary` lavender (S31; current code has them swapped and uses streak crimson) | `surface-container-highest`, 0.55 opacity, `outline-variant` stroke |
| tier | `tier.<tierOf(step)>` | same as focus passive (unranked stays dark) |

Sex comes from `use-profile-sex.ts`. Unknown sex renders male art.
## 3. Exercise library + mapping AI plan lifts (AMI-161)

AI plans invent names ("Incline DB press", "Tricep dips"). Only 6 of 17 test lifts matched the 20-entry mobile catalog. The fix is server-side and canonical.

**Library:** `apps/api/src/data/exercises/{push,pull,legs,core}.ts` (~120 entries, ≤300 lines each).

```ts
type LibraryExercise = {
  id: string;                 // "bench_press", "incline_dumbbell_press", "triceps_dip"
  name: string;               // display name
  aliases: string[];          // normalized forms: "bb bench", "flat bench press"
  equipment: string[];        // onboarding ids: barbell, dumbbells, machines, cables, bands, bodyweight, bench
  pattern: "push" | "pull" | "legs" | "core";
  muscles: { id: MuscleId; pct: number }[];   // sums to 100; role = pct >= 30 ? primary : secondary
  scoring: "load" | "bodyweight" | "reps" | "time";
  bwFactor?: number;          // bodyweight lifts: pull_up 1.0, chin_up 1.0, triceps_dip 0.95, inverted_row 0.6, push_up 0.65
  standard?: { anchor: AnchorId } | { parent: string; ratio: number };  // absent = unranked lift
};
type AnchorId = "back_squat" | "bench_press" | "deadlift" | "overhead_press" | "pull_up" | "push_up" | "plank";
```

**Resolve pipeline** (`apps/api/src/services/exercise-resolve.ts`, pure parts in `lib/exercise-library/normalize.ts`):

1. `normalize(name)`: lowercase, strip punctuation and parentheses, expand `db→dumbbell`, `bb→barbell`, `kb→kettlebell`, singularize, drop filler (`the`, `standing`, `seated` only when no alias uses it).
2. Exact hit on `id`, normalized `name` or `aliases`.
3. Token-set match: Jaccard ≥ 0.8 **and** same equipment token (never map "dumbbell row" to "barbell row").
4. D1 cache `exercise_tags` keyed by normalized name (global, no user data).
5. Miss: `ExerciseTagger` AI port, batched per plan: `tag({ names, library: {id,name}[] }) → { name, canonicalId | null, muscles, scoring, pattern }[]`. OpenAI adapter uses strict `json_schema`; the heuristic adapter uses the keyword table from today's `muscle-regions.ts`. Output is Zod-validated: muscle ids must be in the enum, pcts must sum to 100 ±2. Factory: `getExerciseTagger(env)` follows `AI_PROVIDER`. Usage goes to `ai_usage` as system cost, not user credits.
6. Result: `canonicalId` = library id, or `tag:<normalized>` for an AI-tagged unknown. Unknown lifts count for muscle volume and focus maps, never for tiers (no standard).

**When:** `persist-plan.ts` resolves all plan exercises once (one tagger call per plan) and writes `workout_exercises.canonical_id`. Rows written elsewhere (chat swaps) may stay null. The strength recompute resolves null rows lazily by `exercise_name` and backfills `set_logs.canonical_id`.
**Wire:** `PlanExerciseSchema` gains `canonicalId: string | null` and `muscles: {id, pct, role}[]` (default `[]`). `GET /v1/exercises/:canonicalId` returns the library entry for hub items. Mobile `exercise-catalog.json` gains `canonicalId` per entry (AMI-169).
**Gate:** fixture `apps/api/scripts/fixtures/ai-plan-exercise-names.json` (≥100 names from real local plan runs). At least 95% must resolve without the tagger.

## 4. Set logging source (exists, two gaps)

Today: `LiveWorkoutScreen` steppers → `workout-store.logSet` → `persistSet` → `POST /v1/workouts/sessions/:id/sets` (`routes/workouts.ts:79`) → D1 `set_logs(weight_kg, reps, exercise_id, exercise_name)`. Per-set weight and reps **are** captured. `exercise_id` is the plan row id (`workout_exercises.id`), not a canonical id.

Gaps: (a) API failure falls back to local SQLite only, so those sets never reach scoring (accepted v1: tiers count server sets only). (b) Bodyweight lifts: `weight_kg` = **added** load; HUD labels it "+ kg added" (AMI-169).

## 5. D1 schema

| Migration | Ticket | Contents |
| --- | --- | --- |
| `0018_exercise_library.sql` | AMI-161 | `exercise_tags(normalized_name PK, canonical_id, muscles_json, scoring, pattern, source 'ai'\|'heuristic', model, created_at)`; `ALTER workout_exercises ADD canonical_id text`; `ALTER set_logs ADD canonical_id text`; index `set_logs(canonical_id)` |
| `0019_revise_drafts.sql` | AMI-163 | `revise_drafts` (§8.3) |
| `0020_strength_scores.sql` | AMI-165 | tables below |

```
exercise_scores  (user_id, exercise_id, sustained_pct real, best_pct real, last_session_pct real,
                  best_e1rm_kg real, sessions int, display_step int, below_count int,
                  standards_version text, updated_at)                 PK(user_id, exercise_id)
muscle_scores    (user_id, muscle_id, pct real, display_step int, contributors_json, updated_at) PK(user_id, muscle_id)
strength_summary (user_id PK, overall_pct real null, overall_step int null, groups_json,
                  ranked_exercises int, groups_covered int, updated_at)
strength_events  (id PK, user_id, session_id, scope 'exercise'|'muscle'|'group'|'overall',
                  ref_id, from_step int null, to_step int, created_at)   idx(user_id, session_id)
```

All reads and writes filter by `user_id`. Account deletion cascades through `users` FKs.

## 6. Standards + scoring (AMI-165)

### 6.1 Standards data

`apps/api/src/data/strength-standards/{male,female}.ts`, `STANDARDS_VERSION = "2026.11-v1"`:

```ts
// per AnchorId: rows every 10 kg bodyweight, values = e1RM kg (load), reps (reps), seconds (time)
{ bench_press: [[50, T5, T20, T50, T80, T95], [60, …], …, [140, …]] }
```

**Seed:** `apps/api/scripts/build-standards.ts` reads a local OpenPowerlifting CSV extract (public domain, not committed). It takes Raw-equipment quantiles per sex × 10 kg bodyweight class for squat, bench, deadlift and writes TS. OPL lifters are stronger than gym users, so the script maps our anchors to OPL quantiles with one table `GYM_TO_OPL_Q`. That table is calibrated once so the male 80 kg anchors land within ±10% of these bodyweight multiples: bench 0.5/0.75/1.0/1.25/1.5, squat 0.75/1.0/1.4/1.8/2.25, deadlift 1.0/1.3/1.7/2.1/2.6. Overhead press = 0.62 × bench. Pull-up, push-up and plank anchors are hand-set in the script with a comment per value. Derived lifts use `parent × ratio` (e.g. `incline_dumbbell_press` = bench × 0.36 per hand). One coach review before ship. v2 re-fits from Mirra `set_logs` once a cohort has ≥2,000 lifters.

### 6.2 Pure functions (`apps/api/src/lib/strength/`, unit-tested by `scripts/assert-strength.ts` → `npm run test:strength`)

| File | Function |
| --- | --- |
| `tiers.ts` | `stepOfPct(pct)`, `tierOfStep(step) → {tier, division}`, `stepLowerPct(step)`, `label(step) → "Gold II"` |
| `e1rm.ts` | `effectiveLoad(set, ex, bw)` (bodyweight: `bw × bwFactor + added`), `e1rm(load, reps) = load × (1 + reps/30)` |
| `percentile.ts` | `anchorsAt(anchorId, sex, bw)` (linear by bw; mean of both cohorts when sex is unknown), `pctOf(value, anchors)`, `valueAtPct(pct, anchors)` (inverse) |
| `sustain.ts` | `nextExerciseScore(prev, sessionPct)` (EWMA, floor, hysteresis) |
| `aggregate.ts` | `muscleScores`, `groupScores`, `overall` |
| `next-target.ts` | §6.4 |

Rules (research §2.4): working sets only (load lifts: reps 1..15, drop sets below 50% of that session's max load = warm-ups). `session_pct` = best set; `sustained = 0.3 × session + 0.7 × prev` (first session seeds); `exercise_pct = max(sustained, 0.85 × best_pct)`; no time decay. Promote immediately; demote one step only after 2 consecutive sessions below `stepLowerPct(display) − 2`.
- Muscle: `w = pct_involvement × sets_last_90d`, only for involvement ≥25% and ranked exercises. `muscle_pct = Σw·ex_pct / Σw`.
- Group = mean of ranked muscles. `overall = 0.75 × mean(groups) + 0.25 × min(groups)`, unlocked at ≥8 ranked exercises covering ≥5 groups.
- Bodyweight: latest weight log, else `profiles.weight_kg`. No bodyweight means unranked plus a "Add your weight" CTA.

### 6.3 When computed

Recompute runs in the Worker, inline in `POST /v1/workouts/sessions/:id/complete` after `endedAt` is set. `recomputeStrengthSafe(db, userId, sessionId)` never fails the request. Steps: (1) load the session's sets and resolve + backfill canonical ids; (2) update `exercise_scores` for touched exercises; (3) one 90-day sets-per-exercise aggregate query; (4) rewrite all 18 `muscle_scores`, then `strength_summary`; (5) insert `strength_events` for every display-step increase.

The complete response gains `tierChanges: TierChange[]` (max 6, order overall > group > muscle > exercise). Budget: ≤15 D1 statements.

### 6.4 "Next division" as a concrete set

For an exercise (or a muscle's best-weighted contributor):
1. `target_pct = stepLowerPct(display_step + 1)`. For a muscle, convert it to the exercise pct the contributor needs: `ex_pct + (target − muscle_pct) × Σw / w_i`, capped at 99.
2. EWMA means one set rarely jumps a division. Find the smallest `n ∈ {1,2,3}` and the matching session pct `p ≤ target + 10` where `p − (p − s₀)·0.7ⁿ ≥ target`.
3. `value = valueAtPct(p, anchors)`. Reps `r` = the plan's prescribed low end (`"8-12"` → 8), else 8. Load lifts: `kg = value / (1 + r/30)`, rounded **up** to 2.5 kg, or 5 lb when `profiles.units = imperial`. Bodyweight lifts: added = `load − bw × bwFactor`. If that is ≤0, solve reps instead: `r = ceil(30 × (value / (bw·f) − 1))`, capped at 15.
4. Output `{ toLabel: "Gold I", exerciseId, exerciseName, weightKg | null, reps, sessions: n, display: "185 lb × 8" }`. UI copy: "185 lb × 8 for 2 sessions → Gold I". If nothing fits within 3 sessions, return null and the UI shows only the progress bar.

### 6.5 API + contracts (`packages/contracts/src/strength.ts`, AMI-165)

```ts
TierIdSchema = z.enum(["iron","bronze","silver","gold","platinum","diamond","elite","legendary"]);
TierStandingSchema = z.object({ step: z.number().int().min(0).max(21), tier: TierIdSchema,
  division: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(), label: z.string(), pct: z.number(),
  progressToNext: z.number().min(0).max(1).nullable() });
NextTargetSchema = z.object({ toLabel, exerciseId, exerciseName, weightKg: z.number().nullable(), reps, sessions, display });
TierChangeSchema = z.object({ scope: z.enum(["exercise","muscle","group","overall"]), refId, name, from: TierStandingSchema.nullable(), to: TierStandingSchema });
```

| Endpoint | Response |
| --- | --- |
| `GET /v1/strength` | `{ standardsVersion, units, overall: TierStanding \| null, unlock: {ranked, rankedNeeded: 8, groups, groupsNeeded: 5}, groups: {id, standing \| null}[6], muscles: {id, standing \| null}[18] }` |
| `GET /v1/strength/muscles/:muscleId` | `{ id, group, standing, next: NextTarget \| null, contributors: {exerciseId, name, involvementPct, sets90d, standing \| null, bestSet: {weightKg, reps} \| null}[] }` |
| `GET /v1/strength/exercises/:exerciseId` | `{ exerciseId, name, ranked: boolean, standing \| null, next \| null, bestSet \| null, muscles }` |
| `GET /v1/exercises/:canonicalId` (AMI-161) | library entry (no standards numbers) |

Tiers are free (retention hook, research §2.7).

## 7. Mobile surfaces

| Stitch | Surface | Ticket | Stitch screen ids (project `16036285274438790381`) |
| --- | --- | --- | --- |
| S34 / S35 / S37 | strength map (You → "Strength tier" card) / muscle detail sheet / tier ladder | AMI-168 (badge AMI-162) | `cb154d3f761948cd9f3cc1afcaaf2fce` / `13a091151eed425fa4c4651adec522f9` / `f87abb1b9ecd49f78b157addab4d09e4` |
| S36 / S38 | exercise detail anatomy v2 + tier card / workout complete tier-up | AMI-169 | `54bd71822ab4433c9cfedbaeb3b457ed` / `d668ab27332f456dafbf9f0af56d072f` |
| S39 / S40 / S33 | plan chat proposal v2 / Today header chips (new user; `streak9/`) / Kinetic Rank fidelity | AMI-167 / AMI-164 / AMI-164 | `6b6268c18f1e4b30a3f0fcc58d6b8da7` / `e09ef366b78842fbabc261e9936bcd3d`, `3e188c5ee2cf4706855569372d21ff2b` / `0521a986753e48a2bfabb5543a8f23bc` |

## 8. Plan chat diff v2

### 8.1 Contract (`packages/contracts/src/coach-diff.ts`, AMI-163)

Every item has `id`, `tags: string[]` (max 2, S28 pills), `reason: string | null` (rendered after "↳ ").

```ts
MealSnap = { name: string; kcal: number; proteinG: number; carbsG: number; fatG: number };
ExerciseSnap = { name: string; sets: number; reps: string; canonicalId: string | null };
Delta = { kcal: number; proteinG: number; carbsG: number; fatG: number };
ReviseItem = discriminatedUnion("kind", [
  { kind: "meal_swap", slot: MealSlot, before: MealSnap, after: MealSnap, delta: Delta },
  { kind: "meal_add", slot, after: MealSnap },          { kind: "meal_remove", slot, before: MealSnap },
  { kind: "exercise_swap", workoutId, dayLabel /* "Thu · Push day" */, before: ExerciseSnap, after: ExerciseSnap },
  { kind: "exercise_add", workoutId, dayLabel, after: ExerciseSnap, position: number },
  { kind: "exercise_remove", workoutId, dayLabel, before: ExerciseSnap },
  { kind: "pref", op: "avoid" | "prefer" | "diet_tag" | "cuisine_only" | "equipment_add" | "equipment_remove",
    label: string /* "Avoid" */, items: string[] /* ["chicken"] */ },
  { kind: "session_minutes", before: number, after: number, droppedExercises: string[] },
  { kind: "meals_per_day", before: number, after: number },
  { kind: "schedule_day_move", workoutId, title, fromDate, toDate, fromLabel /* "Tue" */, toLabel },
]);
CoachReviseResponse += { draftId: string | null, expiresAt: number | null, items: ReviseItem[] };
POST /v1/coach/revise/apply  body { draftId }  → CoachReviseResponse (applied: true)
```

For one release, the legacy `changes[]` (string before/after) is derived from `items` so older EAS clients keep working. The legacy `intent` apply path stays and is deleted in a later ticket.

### 8.2 Preview shows real names (propose = generate draft)

- `dryRun: true` runs the full edit **in memory**. Meals: targeted slots go through the existing `MealPlanGenerator` port with slot budgets, and the result is real dishes with macros. `services/meal-plan.ts` is split into `draftMeals()` (no writes) + `commitMealDraft()`. Workouts: the edited exercise list. Prefs: the patch.
- Everything is stored in `revise_drafts`. Apply commits the stored rows with **no AI call** in one D1 batch.
- The draft holds `base_hash` (ids + names of touched meal items / workout exercises / plan days). If the hash changed, apply returns 409 `plan_changed` and the UI asks the user to resend.
- One pending draft per user (a new propose expires the old one). TTL 30 min.
- Limits: propose ≤ 6/day + AI credits. A propose that drafts meals counts `meal_plan.generate` (2/day) at propose time; at the cap the meal part is skipped with a warning and the rest is still proposed (AMI-170). Apply counts only `coach.revise` (4/day) and never spends the meal cap. This keeps the AMI-159 caps.

### 8.3 `revise_drafts`

`id PK, user_id, status 'pending'|'applied'|'expired', date, intent_json, items_json, prefs_patch_json, meal_draft_json, workout_draft_json, schedule_draft_json, base_hash, created_at, expires_at, applied_at`. All draft columns are nullable. AMI-163 creates all of them so AMI-166 needs no migration.

### 8.4 Intent v2 (`ports/plan-reviser.ts`, both adapters, AMI-163)

Adds:
`mealSlots: MealSlot[]`, `exerciseSwaps: {from, to | null}[]`, `exerciseAdds: {name, sets?, reps?}[]`, `exerciseRemoves: string[]`, `preferExercises: string[]` (replaces `preferBench`), `scheduleMoves: {from: weekday | date, to}[]`, `reasons: Record<itemKey, string>` (≤80 chars, sanitized).

Heuristic adapter regexes: `(replace|swap) X (with|for) Y`, `swap|change my (breakfast|lunch|dinner|snack)`, `move (\w+day)('s)? workout to (\w+day)`, `add X`, `drop|remove X`.

**Targeting:**
- Meal: `context.mealItemId` wins, then `mealSlots`, then all open (not logged) slots only when the message is a whole-day ask. "Swap my lunch" touches lunch only.
- Exercise: `from` is matched against the target workout's exercises by normalized name / canonical id (`normalize` from AMI-161). If nothing matches, return a warning naming the exercises the user has. Do not silently no-op.
- Workout day: `context.workoutId`, then the day named in text, then today, then the next lift.

### 8.5 Fixes inside v2

| Bug | Fix | Ticket |
| --- | --- | --- |
| `has()` ignores `full_gym` (`workout-revise.ts:74`) | `hasGear(equipment)(g)`: true for bodyweight, listed gear, or `full_gym` ⊇ {barbell, dumbbells, machines, cables, bench, bands} | AMI-166 |
| "Prefer bench press" gives no row | `preferExercises` resolves to a library id and swaps it into the push slot with the same pattern; otherwise `exercise_add` | AMI-166 |
| Meal preview "new dish ~870 kcal" | real draft (§8.2) | AMI-163 |
| "Before: nothing / After: chicken" | `pref` item with `label: "Avoid"` | AMI-163 |
| Swap lunch rebuilds all 4 | slot targeting | AMI-163 |
| No sets × reps / deltas / tags / ↳ | snapshots + `delta` + deterministic tags | AMI-163/166 |
| No schedule edits | `schedule_day_move` swaps `plan_days` rows (future dates only; never a day with a logged session) | AMI-166 |

**Tags are deterministic.** The server computes them, not AI free text.
Meal tags: "Target intact" when |Δkcal| ≤ 5% of the slot budget, else "+120 kcal" / "−120 kcal"; add "High protein" when Δprotein ≥ +10 g. Exercise tags: "Same muscles" when the primary muscle set overlaps (library), plus the after-exercise equipment ("Dumbbells"). Reason line: meals always get the deterministic delta ("−35g carbs · +10g protein · 490 kcal"); exercises use the AI reason, falling back to "Trains chest, triceps".

### 8.6 Mobile (AMI-167)

`ProposalCard.tsx` (299 lines now) splits into `ProposalCard`, `MealDiffRow`, `ExerciseDiffRow`, `PrefDiffRow`, `ScheduleDiffRow`, `proposal-model.ts` (replaces `proposal-rows.ts`, keeps its tests). Section order and titles stay as S28: WORKOUT REVISION, MEAL ADJUSTMENT, PLAN PREFERENCES, plus SCHEDULE. "Yes, apply" posts `draftId`. A 409 shows "Your plan changed. Send that again?".

## 9. Existing fixes (AMI-164)

| Issue | Fix |
| --- | --- |
| sx lacks `font-headline-lg/-sm`, `font-body-md/-sm`, `font-label-caps` (`sx.ts:114`) | `font-<scale>` sets family **and** weight from DESIGN typography. `sx.ts` is 637 lines, so split it into `theme/sx/{index,colors,spacing,type,layout}.ts` with `@/theme/sx` unchanged |
| Double top inset (`KineticRankScreen.tsx:65` + `ScreenScroll.tsx:43`) | `ScreenScroll` prop `insetTop?: boolean` (default true); Kinetic passes false |
| CTA half width (`left-0 right-0` ignored, `sx.ts:289`) | add `left-0`, `right-0`, `top-*`/`bottom-*` numerics |
| Tier rows lack S33 pills / connector / unlock copy | S33 states: "Unlocked · Day N", "Active Tier", "In Progress (b/Nd)", "Locked", "Elite Tier · Locked"; vertical connector; footer "Next milestone: Forge · 30 days". Unlock copy describes only real things (badge, chip). Copy goes in `src/content/rank.ts`, never S33's invented DEXA/XP lines |
| Rank chip hidden until best ≥7 (`TodayHeader.tsx:55`) | locked chip: lock glyph + "Spark 3/7" muted; becomes the title once unlocked (S40) |
| "Rest counts." truncates | remove the microcopy from the header; the check-in pill only shows when due. Below 360pt the rank chip collapses to its glyph |
| Streak chip cold 0 | S40 zero state: outlined grey flame + "0", a11y "Start a streak: check in today" |

## 10. Build waves (tickets in `docs/05-project-management/tickets/`)

Wave 0: PM generates + approves Stitch S34-S40 (`stitch/prompts/`).
Wave 1: AMI-161 (API library), AMI-162 (mobile anatomy + tier primitives), AMI-163 (API chat v2 core), AMI-164 (mobile Kinetic/Today).
Wave 2: AMI-165 (API strength engine), AMI-166 (API chat workout/schedule), AMI-167 (mobile chat v2 UI).
Wave 3: AMI-168 (strength map / muscle / ladder), AMI-169 (exercise detail v2 + complete tier-up).

**Shared-file locks** (append-only, rebase before merge): `packages/contracts/src/index.ts`, `apps/api/src/db/schema/index.ts`, `apps/api/src/app.ts` route list, `apps/api/package.json` scripts, `apps/mobile/src/lib/api/index.ts`, `integrations.md` port table.
