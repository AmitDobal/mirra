import type { LibraryExercise } from "../../lib/exercise-library/types";
import { CORE_EXERCISES } from "./core";
import { LEG_EXERCISES } from "./legs";
import { PULL_EXERCISES } from "./pull";
import { PUSH_EXERCISES } from "./push";

/** Canonical exercise library (arch §3). Ids are stable: tiers and set logs key on them. */
export const EXERCISE_LIBRARY: readonly LibraryExercise[] = [
  ...PUSH_EXERCISES,
  ...PULL_EXERCISES,
  ...LEG_EXERCISES,
  ...CORE_EXERCISES,
];
