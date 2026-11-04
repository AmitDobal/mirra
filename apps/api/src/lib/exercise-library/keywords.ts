/**
 * Keyword table for the heuristic ExerciseTagger, ported from the mobile
 * `body-map/muscle-regions.ts` table and widened to movement words. First match wins,
 * so specific phrases sit above generic ones. Every row sums to 100.
 */
import type { ExercisePattern, ExerciseScoring, MuscleId } from "@mirra/contracts";

export type KeywordRule = {
  /** Matched against the normalized name as whole words / phrases. */
  any: readonly string[];
  muscles: Partial<Record<MuscleId, number>>;
  pattern: ExercisePattern;
  scoring: ExerciseScoring;
};

export const KEYWORD_RULES: readonly KeywordRule[] = [
  { any: ["stretch", "mobility", "foam", "yoga", "hip flexor", "warm up", "cool down"],
    muscles: { hamstrings: 25, glutes: 25, lower_back: 25, quads: 25 }, pattern: "legs", scoring: "time" },
  { any: ["leg curl", "hamstring", "nordic"], muscles: { hamstrings: 85, calves: 15 }, pattern: "legs", scoring: "load" },
  { any: ["leg extension", "sissy"], muscles: { quads: 100 }, pattern: "legs", scoring: "load" },
  { any: ["calf"], muscles: { calves: 100 }, pattern: "legs", scoring: "reps" },
  { any: ["face pull", "rear delt", "reverse fly", "pull apart"],
    muscles: { rear_delts: 50, upper_back: 35, traps: 15 }, pattern: "pull", scoring: "load" },
  { any: ["lateral raise", "side raise", "upright"], muscles: { side_delts: 70, traps: 30 }, pattern: "push", scoring: "load" },
  { any: ["shrug", "trap"], muscles: { traps: 85, forearms: 15 }, pattern: "pull", scoring: "load" },
  { any: ["tricep", "dip", "pushdown", "skull", "kickback"],
    muscles: { triceps: 80, chest: 10, front_delts: 10 }, pattern: "push", scoring: "load" },
  { any: ["curl", "bicep", "chin"], muscles: { biceps: 80, forearms: 20 }, pattern: "pull", scoring: "load" },
  { any: ["pulldown", "pull up", "lat", "pullover"],
    muscles: { lats: 60, biceps: 25, upper_back: 15 }, pattern: "pull", scoring: "load" },
  { any: ["row"], muscles: { upper_back: 35, lats: 35, biceps: 15, rear_delts: 15 }, pattern: "pull", scoring: "load" },
  { any: ["glute", "bridge", "hip thrust", "abduction"], muscles: { glutes: 70, hamstrings: 30 }, pattern: "legs", scoring: "load" },
  { any: ["adduction", "adductor", "copenhagen"], muscles: { adductors: 100 }, pattern: "legs", scoring: "load" },
  { any: ["deadlift", "hinge", "good morning", "swing", "pull through"],
    muscles: { hamstrings: 40, glutes: 35, lower_back: 25 }, pattern: "legs", scoring: "load" },
  { any: ["back extension", "superman", "erector", "spinae"],
    muscles: { lower_back: 60, glutes: 40 }, pattern: "core", scoring: "reps" },
  { any: ["lunge", "split", "step up"], muscles: { quads: 45, glutes: 35, hamstrings: 10, adductors: 10 }, pattern: "legs", scoring: "load" },
  { any: ["squat", "leg press", "thruster", "wall sit", "quad", "vastus"],
    muscles: { quads: 50, glutes: 30, adductors: 10, hamstrings: 10 }, pattern: "legs", scoring: "load" },
  { any: ["shoulder", "overhead", "military", "arnold", "pike", "deltoid", "delt"],
    muscles: { front_delts: 45, side_delts: 20, triceps: 25, traps: 10 }, pattern: "push", scoring: "load" },
  { any: ["bench", "chest", "push up", "fly", "pec", "pectoral", "press"],
    muscles: { chest: 60, triceps: 25, front_delts: 15 }, pattern: "push", scoring: "load" },
  { any: ["twist", "oblique", "woodchop", "side plank", "pallof", "rotation"],
    muscles: { obliques: 60, abs: 40 }, pattern: "core", scoring: "reps" },
  { any: ["plank", "crunch", "sit up", "ab", "abdominal", "core", "hollow", "leg raise", "dead bug", "rectus", "serratus"],
    muscles: { abs: 70, obliques: 30 }, pattern: "core", scoring: "reps" },
  { any: ["carry", "farmer", "grip", "wrist", "forearm", "hang"],
    muscles: { forearms: 60, traps: 40 }, pattern: "pull", scoring: "time" },
  { any: ["jump", "burpee", "sprint", "cardio", "run", "bike", "jack", "high knee", "climber", "skip", "rowing", "rower"],
    muscles: { quads: 30, glutes: 25, calves: 20, hamstrings: 15, abs: 10 }, pattern: "legs", scoring: "time" },
];

/** Full-body spread when nothing matches. Still non-empty so focus maps never show 0%. */
export const DEFAULT_RULE: KeywordRule = {
  any: [],
  muscles: { quads: 25, glutes: 25, chest: 25, upper_back: 25 },
  pattern: "legs",
  scoring: "reps",
};

const hasPhrase = (normalized: string, phrase: string): boolean =>
  ` ${normalized} `.includes(` ${phrase} `);

export const ruleFor = (normalized: string): KeywordRule =>
  KEYWORD_RULES.find((r) => r.any.some((p) => hasPhrase(normalized, p))) ?? DEFAULT_RULE;
