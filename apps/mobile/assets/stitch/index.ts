/**
 * Local require() maps for Stitch AIDA assets (Expo Metro bundler).
 * Paths match docs/03-engineering/stitch-assets.md.
 *
 * Gendered onboarding people assets live under `male/` / `female/`.
 * Female heroes from Stitch S02c welcome (`0608cba57d2e45e5a1aaa6091a4e397b`).
 */

export const s02WelcomeHook = {
  heroRunnerSilhouette: require("./s02_welcome_hook/hero-runner-silhouette.jpg"),
  portraitWomanAthlete: require("./s02_welcome_hook/portrait-woman-athlete.jpg"),
  portraitMaleCrossfit: require("./s02_welcome_hook/portrait-male-crossfit.jpg"),
} as const;

/** S02 welcome v2 — richer photo collage assets. */
export const s02WelcomeHookV2 = {
  heroRunnerSilhouette: require("./s02_welcome_hook_v2/hero-runner-silhouette.jpg"),
  portraitWomanAthlete: require("./s02_welcome_hook_v2/portrait-woman-athlete.jpg"),
  portraitMaleCrossfit: require("./s02_welcome_hook_v2/portrait-male-crossfit.jpg"),
} as const;

export const s06Target = {
  male: {
    athleteTyingShoes: require("./s06_target/male/athlete-tying-shoes.jpg"),
  },
  female: {
    athleteTyingShoes: require("./s06_target/female/athlete-tying-shoes.jpg"),
  },
  /** @deprecated Prefer `s06Target[gender].athleteTyingShoes`. */
  athleteTyingShoes: require("./s06_target/male/athlete-tying-shoes.jpg"),
} as const;

export const s11GeneratingWeek = {
  male: {
    athleteSquat: require("./s11_generating_week/male/athlete-squat.jpg"),
    sprinterKneeling: require("./s11_generating_week/male/sprinter-kneeling.jpg"),
    athleteBarbell: require("./s11_generating_week/male/athlete-barbell.jpg"),
    athleteSquatBw: require("./s11_generating_week/male/athlete-squat-bw.jpg"),
    sprinterKneelingBw: require("./s11_generating_week/male/sprinter-kneeling-bw.jpg"),
    athleteBarbellBw: require("./s11_generating_week/male/athlete-barbell-bw.jpg"),
  },
  female: {
    athleteSquat: require("./s11_generating_week/female/athlete-squat.jpg"),
    sprinterKneeling: require("./s11_generating_week/female/sprinter-kneeling.jpg"),
    athleteBarbell: require("./s11_generating_week/female/athlete-barbell.jpg"),
    athleteSquatBw: require("./s11_generating_week/female/athlete-squat-bw.jpg"),
    sprinterKneelingBw: require("./s11_generating_week/female/sprinter-kneeling-bw.jpg"),
    athleteBarbellBw: require("./s11_generating_week/female/athlete-barbell-bw.jpg"),
  },
  /** @deprecated Prefer gendered keys via onboarding imagery helper. */
  athleteSquat: require("./s11_generating_week/male/athlete-squat.jpg"),
  sprinterKneeling: require("./s11_generating_week/male/sprinter-kneeling.jpg"),
  athleteBarbell: require("./s11_generating_week/male/athlete-barbell.jpg"),
  athleteSquatBw: require("./s11_generating_week/male/athlete-squat-bw.jpg"),
  sprinterKneelingBw: require("./s11_generating_week/male/sprinter-kneeling-bw.jpg"),
  athleteBarbellBw: require("./s11_generating_week/male/athlete-barbell-bw.jpg"),
} as const;

export const s12WeekReveal = {
  male: {
    dumbbellOverheadPress: require("./s12_week_reveal/male/dumbbell-overhead-press.jpg"),
    barbellBentOverRow: require("./s12_week_reveal/male/barbell-bent-over-row.jpg"),
    barbellBackSquat: require("./s12_week_reveal/male/barbell-back-squat.jpg"),
  },
  female: {
    dumbbellOverheadPress: require("./s12_week_reveal/female/dumbbell-overhead-press.jpg"),
    barbellBentOverRow: require("./s12_week_reveal/female/barbell-bent-over-row.jpg"),
    barbellBackSquat: require("./s12_week_reveal/female/barbell-back-squat.jpg"),
  },
  /** @deprecated Prefer gendered keys via onboarding imagery helper. */
  dumbbellOverheadPress: require("./s12_week_reveal/male/dumbbell-overhead-press.jpg"),
  barbellBentOverRow: require("./s12_week_reveal/male/barbell-bent-over-row.jpg"),
  barbellBackSquat: require("./s12_week_reveal/male/barbell-back-squat.jpg"),
} as const;

export const s13Paywall = {
  male: {
    coachCutout: require("./s13_paywall/male/coach-cutout.jpg"),
  },
  female: {
    coachCutout: require("./s13_paywall/female/coach-cutout.jpg"),
  },
  /** @deprecated Prefer gendered keys via onboarding imagery helper. */
  coachCutout: require("./s13_paywall/male/coach-cutout.jpg"),
} as const;

/** S13 hard paywall — athlete tile from Stitch redesign. */
export const s13PaywallHard = {
  coachAthlete: require("./s13_paywall_hard/coach-athlete.jpg"),
} as const;

/** S09B — Stitch-generated trainer character portraits (Kinetic Performance). */
export const s09bTrainers = {
  drill: require("./s09b_trainers/drill.jpg"),
  honey: require("./s09b_trainers/honey.jpg"),
  wit: require("./s09b_trainers/wit.jpg"),
  spark: require("./s09b_trainers/spark.jpg"),
  zen: require("./s09b_trainers/zen.jpg"),
  rival: require("./s09b_trainers/rival.jpg"),
} as const;

export const s15Today = {
  athleteMidMotion: require("./s15_today/athlete-mid-motion.jpg"),
  trainerSquat: require("./s15_today/trainer-squat.jpg"),
} as const;

/** S15B — Today check-in inline (avatar + weekly mirror chip), resized to 320px. */
export const s15bTodayCheckinInline = {
  avatar: require("./s15b_today_checkin_inline/avatar.jpg"),
  mirror: require("./s15b_today_checkin_inline/mirror.jpg"),
} as const;

export const s16LiveWorkoutHud = {
  athleteDeepSquat: require("./s16_live_workout_hud/athlete-deep-squat.jpg"),
} as const;

export const s18Fuel = {
  mealProteinOats: require("./s18_fuel/meal-protein-oats.jpg"),
  mealChickenQuinoa: require("./s18_fuel/meal-chicken-quinoa.jpg"),
  mealSalmonAsparagus: require("./s18_fuel/meal-salmon-asparagus.jpg"),
} as const;

export const s19LogMeal = {
  mealFlankSteak: require("./s19_log_meal/meal-flank-steak.jpg"),
} as const;

export const s21RebuildPreview = {
  athleteStretching: require("./s21_rebuild_preview/athlete-stretching.jpg"),
} as const;

export const s22ProgressGallery = {
  checkinBaselineStudio: require("./s22_progress_gallery/checkin-baseline-studio.jpg"),
  checkinLockerDefined: require("./s22_progress_gallery/checkin-locker-defined.jpg"),
  checkinUpperBody: require("./s22_progress_gallery/checkin-upper-body.jpg"),
  checkinMidPhase: require("./s22_progress_gallery/checkin-mid-phase.jpg"),
  checkinApartment: require("./s22_progress_gallery/checkin-apartment.jpg"),
  checkinDayOne: require("./s22_progress_gallery/checkin-day-one.jpg"),
} as const;

export const s23MirrorComparison = {
  progressAfter: require("./s23_mirror_comparison/progress-after.jpg"),
  progressBaseline: require("./s23_mirror_comparison/progress-baseline.jpg"),
} as const;

export const s24ProfileSettings = {
  avatarAlexChen: require("./s24_profile_settings/avatar-alex-chen.jpg"),
} as const;

export const s20bDailyCheckInTap = {
  hero: require("./s20b_daily_check_in_tap/hero.jpg"),
} as const;

export const s20cAdjustToday = {
  hero: require("./s20c_adjust_today/hero.jpg"),
} as const;

/** S25 — Exercise hub (session hero + library thumbs), resized to 640px. */
export const s25ExerciseHub = {
  hero: require("./s25_exercise_hub/hero.jpg"),
  bench: require("./s25_exercise_hub/bench.jpg"),
  row: require("./s25_exercise_hub/row.jpg"),
  rdl: require("./s25_exercise_hub/rdl.jpg"),
  ohp: require("./s25_exercise_hub/ohp.jpg"),
  pushdown: require("./s25_exercise_hub/pushdown.jpg"),
} as const;

/** S26 — Exercise detail hero. */
export const s26ExerciseDetail = {
  hero: require("./s26_exercise_detail/hero.jpg"),
} as const;

/** S27 — Swap / add sheet alternative thumbs (320px). */
export const s27ExerciseSwapAdd = {
  dbPress: require("./s27_exercise_swap_add/db-press.jpg"),
  machinePress: require("./s27_exercise_swap_add/machine-press.jpg"),
  pushup: require("./s27_exercise_swap_add/pushup.jpg"),
  cableFly: require("./s27_exercise_swap_add/cable-fly.jpg"),
  inclineDb: require("./s27_exercise_swap_add/incline-db.jpg"),
} as const;

export const stitchAssets = {
  s02WelcomeHook,
  s02WelcomeHookV2,
  s06Target,
  s09bTrainers,
  s11GeneratingWeek,
  s12WeekReveal,
  s13Paywall,
  s13PaywallHard,
  s15Today,
  s15bTodayCheckinInline,
  s16LiveWorkoutHud,
  s18Fuel,
  s19LogMeal,
  s20bDailyCheckInTap,
  s20cAdjustToday,
  s21RebuildPreview,
  s22ProgressGallery,
  s23MirrorComparison,
  s24ProfileSettings,
  s25ExerciseHub,
  s26ExerciseDetail,
  s27ExerciseSwapAdd,
} as const;

export default stitchAssets;
