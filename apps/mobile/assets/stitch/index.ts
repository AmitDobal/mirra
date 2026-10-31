/**
 * Local require() maps for Stitch AIDA assets (Expo Metro bundler).
 * Paths match docs/03-engineering/stitch-assets.md.
 */

export const s02WelcomeHook = {
  heroRunnerSilhouette: require("./s02_welcome_hook/hero-runner-silhouette.jpg"),
  portraitWomanAthlete: require("./s02_welcome_hook/portrait-woman-athlete.jpg"),
  portraitMaleCrossfit: require("./s02_welcome_hook/portrait-male-crossfit.jpg"),
} as const;

export const s06Target = {
  athleteTyingShoes: require("./s06_target/athlete-tying-shoes.jpg"),
} as const;

export const s11GeneratingWeek = {
  athleteSquat: require("./s11_generating_week/athlete-squat.jpg"),
  sprinterKneeling: require("./s11_generating_week/sprinter-kneeling.jpg"),
  athleteBarbell: require("./s11_generating_week/athlete-barbell.jpg"),
} as const;

export const s12WeekReveal = {
  dumbbellOverheadPress: require("./s12_week_reveal/dumbbell-overhead-press.jpg"),
  barbellBentOverRow: require("./s12_week_reveal/barbell-bent-over-row.jpg"),
  barbellBackSquat: require("./s12_week_reveal/barbell-back-squat.jpg"),
} as const;

export const s13Paywall = {
  coachCutout: require("./s13_paywall/coach-cutout.jpg"),
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

export const stitchAssets = {
  s02WelcomeHook,
  s06Target,
  s09bTrainers,
  s11GeneratingWeek,
  s12WeekReveal,
  s13Paywall,
  s15Today,
  s16LiveWorkoutHud,
  s18Fuel,
  s19LogMeal,
  s21RebuildPreview,
  s22ProgressGallery,
  s23MirrorComparison,
  s24ProfileSettings,
} as const;

export default stitchAssets;
